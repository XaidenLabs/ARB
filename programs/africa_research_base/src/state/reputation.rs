use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Reputation {
    pub contributor: Pubkey,
    pub total_uploads: u32,
    pub dataset_count: u32, // Track number of datasets created by this contributor
    pub download_time: i64,
    pub total_quality_score: u64,
    pub total_downloads: u64,
    pub total_citations: u32,
    pub reputation_score: u32,

    // New fields for advanced scoring
    pub total_reviews: u64,
    pub last_activity_timestamp: i64,
    pub daily_activity_points: u32,

    // Point Accumulators
    pub total_upload_points: u64,
    pub total_review_points: u64,
    pub total_activity_points: u64,

    // Token Redemption
    pub claimed_points: u64,

    pub bump: u8,
}
