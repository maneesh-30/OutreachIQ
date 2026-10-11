"""SQLite persistence (SQLAlchemy 2.0). Stores runs, prospects, emails, and the
per-agent step trace that powers the live view + cost dashboard.
"""
from __future__ import annotations

import datetime as dt
import pathlib

from sqlalchemy import (create_engine, String, Integer, Float, Text, ForeignKey,
                        DateTime)
from sqlalchemy.orm import (DeclarativeBase, Mapped, mapped_column, relationship,
                            sessionmaker)

DB_PATH = pathlib.Path(__file__).resolve().parent / "outreachiq.db"
ENGINE = create_engine(f"sqlite:///{DB_PATH}", echo=False)
Session = sessionmaker(bind=ENGINE, expire_on_commit=False)


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


class Base(DeclarativeBase):
    pass


class Run(Base):
    __tablename__ = "runs"
    id: Mapped[int] = mapped_column(primary_key=True)
    top_n: Mapped[int] = mapped_column(Integer)
    company: Mapped[str] = mapped_column(String(200), default="")  # the company this run was for
    source: Mapped[str] = mapped_column(String(30), default="pool")  # pool | live | live→pool (fallback)
    status: Mapped[str] = mapped_column(String(20), default="running")  # running|done|error
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    cost_azure: Mapped[float] = mapped_column(Float, default=0.0)
    cost_cheap: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_now)

    prospects: Mapped[list["Prospect"]] = relationship(back_populates="run", cascade="all, delete-orphan")
    steps: Mapped[list["Step"]] = relationship(back_populates="run", cascade="all, delete-orphan")


class Prospect(Base):
    __tablename__ = "prospects"
    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("runs.id"))
    name: Mapped[str] = mapped_column(String(200))
    domain: Mapped[str] = mapped_column(String(200), default="")
    blurb: Mapped[str] = mapped_column(Text, default="")
    country: Mapped[str] = mapped_column(String(80), default="")
    region: Mapped[str] = mapped_column(String(20), default="")  # local | international
    discovery_score: Mapped[int] = mapped_column(Integer, default=0)
    fit_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fit_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    facts_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    pains_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    hook: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")

    run: Mapped["Run"] = relationship(back_populates="prospects")
    email: Mapped["Email | None"] = relationship(back_populates="prospect",
                                                 cascade="all, delete-orphan", uselist=False)


class Email(Base):
    __tablename__ = "emails"
    id: Mapped[int] = mapped_column(primary_key=True)
    prospect_id: Mapped[int] = mapped_column(ForeignKey("prospects.id"))
    subject: Mapped[str] = mapped_column(Text, default="")
    body: Mapped[str] = mapped_column(Text, default="")
    sources_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    prospect: Mapped["Prospect"] = relationship(back_populates="email")


class Step(Base):
    __tablename__ = "steps"
    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("runs.id"))
    prospect_id: Mapped[int | None] = mapped_column(ForeignKey("prospects.id"), nullable=True)
    agent: Mapped[str] = mapped_column(String(40))
    provider: Mapped[str] = mapped_column(String(20))
    model: Mapped[str] = mapped_column(String(80))
    tokens_in: Mapped[int] = mapped_column(Integer, default=0)
    tokens_out: Mapped[int] = mapped_column(Integer, default=0)
    cost: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_now)

    run: Mapped["Run"] = relationship(back_populates="steps")


def init_db() -> None:
    Base.metadata.create_all(ENGINE)


if __name__ == "__main__":
    init_db()
    print(f"DB ready at {DB_PATH}")
