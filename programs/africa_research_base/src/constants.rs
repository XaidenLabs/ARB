use anchor_lang::prelude::*;

#[constant]
pub const SEED: &str = "anchor";
// Constants for reputation scoring
pub const UPLOAD_WEIGHT: u32 = 10; // Keep as base/fallback if needed, though logic changes
pub const DOWNLOAD_WEIGHT: u32 = 2;
pub const CITATION_WEIGHT: u32 = 15;
pub const QUALITY_MULTIPLIER: u32 = 1;

// New Scoring Rules
pub const REVIEW_REWARD: u32 = 50;
pub const COMMUNITY_REWARD: u32 = 20;
pub const DAILY_COMMUNITY_CAP: u32 = 100;

// Tiered Upload Thresholds and Rewards
pub const UPLOAD_TIER_1_THRESHOLD: u8 = 50;
pub const UPLOAD_TIER_2_THRESHOLD: u8 = 71;

pub const UPLOAD_TIER_1_REWARD: u32 = 20; // < 50
pub const UPLOAD_TIER_2_REWARD: u32 = 35; // 50 - 70
pub const UPLOAD_TIER_3_REWARD: u32 = 300; // >= 71

// Token Redemption
pub const POINTS_TO_ARB_RATE: u64 = 1; // 1 Point = 1 ARB (Adjust decimals as needed)
