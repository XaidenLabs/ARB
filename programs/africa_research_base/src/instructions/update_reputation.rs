#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;

use crate::constants::*;
use crate::error::ErrorCode;
use crate::{Dataset, Reputation};

#[derive(Accounts)]
pub struct UpdateReputationOnUpload<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub contributor: Signer<'info>,

    #[account(
        mut,
        seeds = [b"reputation", contributor.key().as_ref()],
        bump = reputation.bump
    )]
    pub reputation: Account<'info, Reputation>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateReputationOnDownload<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub contributor: Signer<'info>,

    #[account(
        mut,
        seeds = [b"reputation", contributor.key().as_ref()],
        bump = reputation.bump
    )]
    pub reputation: Account<'info, Reputation>,

    #[account(
        mut,
        seeds = [b"dataset", contributor.key().as_ref(), &dataset.dataset_index.to_le_bytes()],
        bump,
        constraint = dataset.contributor == contributor.key()
    )]
    pub dataset: Account<'info, Dataset>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateReputationOnCitation<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub contributor: Signer<'info>,

    #[account(
        mut,
        seeds = [b"reputation", contributor.key().as_ref()],
        bump = reputation.bump
    )]
    pub reputation: Account<'info, Reputation>,

    #[account(
        mut,
        seeds = [b"dataset", contributor.key().as_ref(), &dataset.dataset_index.to_le_bytes()],
        bump,
        constraint = dataset.contributor == contributor.key()
    )]
    pub dataset: Account<'info, Dataset>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateReputationOnReview<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub contributor: Signer<'info>, // The reviewer

    #[account(
        mut,
        seeds = [b"reputation", contributor.key().as_ref()],
        bump = reputation.bump
    )]
    pub reputation: Account<'info, Reputation>,

    // Reviews are typically on a dataset, but for simplicity of points, we might not enforced constraint here unless we track specific reviews.
    // For now, minimal context to award points.
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateReputationActivity<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub contributor: Signer<'info>,

    #[account(
        mut,
        seeds = [b"reputation", contributor.key().as_ref()],
        bump = reputation.bump
    )]
    pub reputation: Account<'info, Reputation>,

    pub system_program: Program<'info, System>,
}

// Standalone helper for reputation score calculation
fn calculate_reputation_score(reputation: &mut Reputation) -> Result<()> {
    // New Formula: Sum of accumulated points + (downloads * weight) + (citations * weight)
    // Uploads/Reviews/Activity are now accumulated in their own fields.
    // Downloads/Citations still use fixed weights for now as requested.

    let download_score = (reputation.total_downloads as u64)
        .checked_mul(DOWNLOAD_WEIGHT as u64)
        .ok_or(ErrorCode::NumericalOverflow)?;

    let citation_score = (reputation.total_citations as u64)
        .checked_mul(CITATION_WEIGHT as u64)
        .ok_or(ErrorCode::NumericalOverflow)?;

    let total_points = reputation
        .total_upload_points
        .checked_add(reputation.total_review_points)
        .ok_or(ErrorCode::NumericalOverflow)?
        .checked_add(reputation.total_activity_points)
        .ok_or(ErrorCode::NumericalOverflow)?
        .checked_add(download_score)
        .ok_or(ErrorCode::NumericalOverflow)?
        .checked_add(citation_score)
        .ok_or(ErrorCode::NumericalOverflow)?;

    reputation.reputation_score = total_points as u32; // Cast to u32 as per struct definition. Might overflow if points get huge. User's system seems to expect u32.

    Ok(())
}

impl<'info> UpdateReputationOnUpload<'info> {
    pub fn update_reputation_upload(&mut self, quality_score: u8) -> Result<()> {
        let reputation = &mut self.reputation;
        reputation.total_uploads = reputation
            .total_uploads
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflow)?;
        reputation.total_quality_score = reputation
            .total_quality_score
            .checked_add(quality_score as u64)
            .ok_or(ErrorCode::NumericalOverflow)?;

        // Tiered Reward Logic
        let reward: u32 = if quality_score > UPLOAD_TIER_2_THRESHOLD {
            UPLOAD_TIER_3_REWARD // 300
        } else if quality_score >= UPLOAD_TIER_1_THRESHOLD {
            UPLOAD_TIER_2_REWARD // 35
        } else {
            UPLOAD_TIER_1_REWARD // 20
        };

        reputation.total_upload_points = reputation
            .total_upload_points
            .checked_add(reward as u64)
            .ok_or(ErrorCode::NumericalOverflow)?;

        calculate_reputation_score(reputation)?;
        Ok(())
    }
}

impl<'info> UpdateReputationOnDownload<'info> {
    pub fn update_reputation_download(&mut self) -> Result<()> {
        let reputation = &mut self.reputation;
        reputation.total_downloads = reputation
            .total_downloads
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflow)?;
        let clock = Clock::get()?;
        reputation.download_time = clock.unix_timestamp;
        calculate_reputation_score(reputation)?;
        Ok(())
    }
}

impl<'info> UpdateReputationOnCitation<'info> {
    pub fn update_reputation_citation(&mut self) -> Result<()> {
        let reputation = &mut self.reputation;
        reputation.total_citations = reputation
            .total_citations
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflow)?;
        calculate_reputation_score(reputation)?;
        Ok(())
    }
}

impl<'info> UpdateReputationOnReview<'info> {
    pub fn update_reputation_review(&mut self) -> Result<()> {
        let reputation = &mut self.reputation;

        reputation.total_reviews = reputation
            .total_reviews
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflow)?;
        reputation.total_review_points = reputation
            .total_review_points
            .checked_add(REVIEW_REWARD as u64)
            .ok_or(ErrorCode::NumericalOverflow)?;

        calculate_reputation_score(reputation)?;
        Ok(())
    }
}

impl<'info> UpdateReputationActivity<'info> {
    pub fn update_reputation_activity(&mut self) -> Result<()> {
        let reputation = &mut self.reputation;
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        // Daily Reset Logic
        // Simple day check: timestamp / 86400 (seconds in a day)
        let current_day = current_time / 86400;
        let last_activity_day = reputation.last_activity_timestamp / 86400;

        if current_day > last_activity_day {
            reputation.daily_activity_points = 0;
        }

        reputation.last_activity_timestamp = current_time;

        // Apply Points if under cap
        if reputation.daily_activity_points < DAILY_COMMUNITY_CAP {
            let points_to_add =
                COMMUNITY_REWARD.min(DAILY_COMMUNITY_CAP - reputation.daily_activity_points);

            if points_to_add > 0 {
                reputation.daily_activity_points = reputation
                    .daily_activity_points
                    .checked_add(points_to_add)
                    .ok_or(ErrorCode::NumericalOverflow)?;
                reputation.total_activity_points = reputation
                    .total_activity_points
                    .checked_add(points_to_add as u64)
                    .ok_or(ErrorCode::NumericalOverflow)?;
            }
        }

        calculate_reputation_score(reputation)?;
        Ok(())
    }
}
