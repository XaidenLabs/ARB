use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::constants::POINTS_TO_ARB_RATE;
use crate::error::ErrorCode;
use crate::state::Reputation;

#[derive(Accounts)]
pub struct RedeemPoints<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"reputation", user.key().as_ref()],
        bump = reputation.bump,
        constraint = reputation.contributor == user.key()
    )]
    pub reputation: Account<'info, Reputation>,

    #[account(mut)]
    pub reward_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    /// CHECK: The authority allowed to transfer from the vault
    #[account(
        seeds = [b"vault_authority"],
        bump
    )]
    pub vault_authority: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
}

impl<'info> RedeemPoints<'info> {
    pub fn redeem_points(ctx: Context<RedeemPoints>) -> Result<()> {
        let reputation = &mut ctx.accounts.reputation;

        // Calculate available points
        let total_score = reputation.reputation_score as u64;
        let claimed = reputation.claimed_points;

        if total_score <= claimed {
            return err!(ErrorCode::NumericalOverflow); // Use better error in prod
        }

        let available_points = total_score - claimed;
        let amount_to_transfer = available_points
            .checked_mul(POINTS_TO_ARB_RATE)
            .ok_or(ErrorCode::NumericalOverflow)?;

        if amount_to_transfer == 0 {
            return Ok(());
        }

        // Update claimed points
        reputation.claimed_points = reputation
            .claimed_points
            .checked_add(available_points)
            .ok_or(ErrorCode::NumericalOverflow)?;

        // Transfer Tokens with PDA signer
        let bump = ctx.bumps.vault_authority;
        let seeds = &[b"vault_authority".as_ref(), &[bump]];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.reward_vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

        token::transfer(cpi_ctx, amount_to_transfer)?;

        Ok(())
    }
}
