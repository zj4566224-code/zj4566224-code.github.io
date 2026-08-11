"""family tables

Revision ID: a2f3b8c91d04
Revises: 6d18a696e177
Create Date: 2026-05-20 16:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a2f3b8c91d04'
down_revision: Union[str, None] = '6d18a696e177'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'families',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_families_id'), 'families', ['id'], unique=False)
    op.create_index(op.f('ix_families_owner_id'), 'families', ['owner_id'], unique=False)

    op.create_table(
        'family_members',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('family_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False, server_default='member'),
        sa.Column('joined_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['family_id'], ['families.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_family_members_user'),
    )
    op.create_index(op.f('ix_family_members_id'), 'family_members', ['id'], unique=False)
    op.create_index(op.f('ix_family_members_family_id'), 'family_members', ['family_id'], unique=False)
    op.create_index(op.f('ix_family_members_user_id'), 'family_members', ['user_id'], unique=False)

    op.create_table(
        'family_invitations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('family_id', sa.Integer(), nullable=False),
        sa.Column('inviter_id', sa.Integer(), nullable=False),
        sa.Column('invited_email', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('responded_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['family_id'], ['families.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['inviter_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_family_invitations_id'), 'family_invitations', ['id'], unique=False)
    op.create_index(op.f('ix_family_invitations_family_id'), 'family_invitations', ['family_id'], unique=False)
    op.create_index(op.f('ix_family_invitations_invited_email'), 'family_invitations', ['invited_email'], unique=False)

    op.create_table(
        'family_budgets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('family_id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('period', sa.String(length=20), nullable=False, server_default='monthly'),
        sa.ForeignKeyConstraint(['family_id'], ['families.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('family_id', 'period', name='uq_family_budget_period'),
    )
    op.create_index(op.f('ix_family_budgets_id'), 'family_budgets', ['id'], unique=False)
    op.create_index(op.f('ix_family_budgets_family_id'), 'family_budgets', ['family_id'], unique=False)

    op.create_table(
        'family_goals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('family_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('icon', sa.String(length=50), nullable=True),
        sa.Column('color', sa.String(length=20), nullable=True),
        sa.Column('target_amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('current_amount', sa.Numeric(precision=15, scale=2), server_default='0', nullable=True),
        sa.Column('deadline', sa.Date(), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='active', nullable=True),
        sa.ForeignKeyConstraint(['family_id'], ['families.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_family_goals_id'), 'family_goals', ['id'], unique=False)
    op.create_index(op.f('ix_family_goals_family_id'), 'family_goals', ['family_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_family_goals_family_id'), table_name='family_goals')
    op.drop_index(op.f('ix_family_goals_id'), table_name='family_goals')
    op.drop_table('family_goals')

    op.drop_index(op.f('ix_family_budgets_family_id'), table_name='family_budgets')
    op.drop_index(op.f('ix_family_budgets_id'), table_name='family_budgets')
    op.drop_table('family_budgets')

    op.drop_index(op.f('ix_family_invitations_invited_email'), table_name='family_invitations')
    op.drop_index(op.f('ix_family_invitations_family_id'), table_name='family_invitations')
    op.drop_index(op.f('ix_family_invitations_id'), table_name='family_invitations')
    op.drop_table('family_invitations')

    op.drop_index(op.f('ix_family_members_user_id'), table_name='family_members')
    op.drop_index(op.f('ix_family_members_family_id'), table_name='family_members')
    op.drop_index(op.f('ix_family_members_id'), table_name='family_members')
    op.drop_table('family_members')

    op.drop_index(op.f('ix_families_owner_id'), table_name='families')
    op.drop_index(op.f('ix_families_id'), table_name='families')
    op.drop_table('families')
