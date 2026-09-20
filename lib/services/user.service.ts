import type { SupabaseClient } from '@supabase/supabase-js';
import type { Redis } from '@upstash/redis';
import { z } from 'zod';

import type { Database } from '../types/database.types';
import { onboardingSchema, updateUserSchema } from '../schemas/user.schema';
import { cacheKey } from '../utils/cache';
import { logger } from '../utils/logger';
import {
  AppError,
  ConflictError,
  NotFoundError,
} from '../utils/errors';

type DbClient = SupabaseClient<Database>;

type UserRow = Database['public']['Tables']['users']['Row'];
type TaxSettingsRow = Database['public']['Tables']['tax_settings']['Row'];

type UpdateUserData = z.infer<typeof updateUserSchema>;
type OnboardingData = z.infer<typeof onboardingSchema>;

const USER_CACHE_TTL_SECONDS = 300;

export class UserService {
  private readonly supabase: DbClient;

  private readonly cache: Redis;

  constructor(supabase: DbClient, cache: Redis) {
    this.supabase = supabase;
    this.cache = cache;
  }

  /**
   * Idempotently create a user mapped to an Auth0 identity.
   * If a user already exists for the given auth0Id, it is returned.
   */
  async createUser(auth0Id: string, email: string): Promise<UserRow> {
    if (!auth0Id || !email) {
      throw new AppError(400, 'auth0Id and email are required');
    }

    const existing = await this.getUserByAuth0Id(auth0Id);
    if (existing) {
      return existing;
    }

    const { data, error } = await this.supabase
      .from('users')
      .insert({
        auth0_id: auth0Id,
        email,
      })
      .select('*')
      .single();

    if (error) {
      // Unique constraints on email/auth0_id may throw here.
      logger.error('user.create.failed', error, { auth0Id, email });
      if (error.code === '23505') {
        // Safest assumption: conflict on email or auth0_id.
        throw new ConflictError('User already exists');
      }
      throw new AppError(500, 'Failed to create user');
    }

    await this.setUserCacheByAuth0Id(auth0Id, data);

    logger.info('user.created', { userId: data.id, auth0Id });
    return data;
  }

  /**
   * Resolve a user by Auth0 subject, using Redis cache when possible.
   * Returns null when no user exists yet for this auth0Id.
   */
  async getUserByAuth0Id(auth0Id: string): Promise<UserRow | null> {
    if (!auth0Id) {
      throw new AppError(400, 'auth0Id is required');
    }

    const key = this.userByAuth0CacheKey(auth0Id);
    const cached = await this.cache.get<string | null>(key);

    if (cached) {
      try {
        const parsed: UserRow = JSON.parse(cached);
        return parsed;
      } catch (error) {
        logger.warn('user.cache.parse_failed', { key });
      }
    }

    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('auth0_id', auth0Id)
      .maybeSingle();

    if (error) {
      logger.error('user.fetch_by_auth0.failed', error, { auth0Id });
      throw new AppError(500, 'Failed to load user');
    }

    if (!data) {
      return null;
    }

    await this.setUserCacheByAuth0Id(auth0Id, data);
    return data;
  }

  /**
   * Update mutable user profile fields.
   * Cache is invalidated and refreshed based on the user auth0_id.
   */
  async updateUser(userId: string, data: UpdateUserData): Promise<UserRow> {
    if (!userId) {
      throw new AppError(400, 'userId is required');
    }

    // NOTE: Validation of "data" shape is handled by Zod in the route layer.
    const { data: updated, error } = await this.supabase
      .from('users')
      .update({
        full_name: data.full_name,
        business_name: data.business_name,
        entity_type: data.entity_type,
        timezone: data.timezone,
        state: data.state,
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (error) {
      logger.error('user.update.failed', error, { userId });
      throw new AppError(500, 'Failed to update user');
    }

    if (!updated) {
      throw new NotFoundError('User');
    }

    await this.invalidateUserCache(updated);

    logger.info('user.updated', { userId: updated.id });
    return updated;
  }

  /**
   * Complete onboarding for a user.
   *
   * Safest assumptions (documented):
   * - Onboarding only sets high-level business profile and state.
   * - Tax settings are created with minimal defaults using state only.
   *   Additional tax configuration (filing status, deductions) is managed
   *   separately via the Tax module (Module 4).
   */
  async completeOnboarding(
    userId: string,
    data: OnboardingData,
  ): Promise<{ user: UserRow; taxSettings: TaxSettingsRow }> {
    if (!userId) {
      throw new AppError(400, 'userId is required');
    }

    // Update user profile and mark onboarding as completed.
    const { data: updatedUser, error: userError } = await this.supabase
      .from('users')
      .update({
        business_name: data.business_name,
        entity_type: data.entity_type,
        state: data.state,
        timezone: data.timezone,
        onboarding_completed: true,
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (userError) {
      logger.error('user.onboarding.failed', userError, { userId });
      throw new AppError(500, 'Failed to complete onboarding');
    }

    if (!updatedUser) {
      throw new NotFoundError('User');
    }

    // Create or update tax_settings with minimal information.
    const { data: taxSettings, error: taxError } = await this.supabase
      .from('tax_settings')
      .upsert(
        {
          user_id: userId,
          state: data.state,
          send_quarterly_reminders: true,
        },
        {
          onConflict: 'user_id',
        },
      )
      .select('*')
      .single();

    if (taxError) {
      logger.error('tax_settings.upsert.failed', taxError, { userId });
      throw new AppError(500, 'Failed to initialize tax settings');
    }

    if (!taxSettings) {
      throw new NotFoundError('Tax settings');
    }

    await this.invalidateUserCache(updatedUser);

    logger.info('user.onboarding.completed', {
      userId: updatedUser.id,
      taxSettingsId: taxSettings.id,
    });

    return {
      user: updatedUser,
      taxSettings,
    };
  }

  private userByAuth0CacheKey(auth0Id: string): string {
    return cacheKey('user:auth0', auth0Id);
  }

  private async setUserCacheByAuth0Id(
    auth0Id: string,
    user: UserRow,
  ): Promise<void> {
    const key = this.userByAuth0CacheKey(auth0Id);
    await this.cache.setex(key, USER_CACHE_TTL_SECONDS, JSON.stringify(user));
  }

  private async invalidateUserCache(user: UserRow): Promise<void> {
    // We key user cache by auth0_id; if it is missing, there is nothing to invalidate.
    if (!user.auth0_id) {
      return;
    }

    const key = this.userByAuth0CacheKey(user.auth0_id);
    await this.cache.del(key);
  }
}


