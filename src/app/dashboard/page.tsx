import Link from "next/link";
import type { ReactNode } from "react";
import {
  getPrimaryPlayerForUser,
  requireUser,
} from "@/lib/auth";
import {
  getDashboardStats,
  getUserProfileSummary,
  listAcceptedAnswersForPlayer,
  listCommunitiesForUser,
  listFollowersForUser,
  listFollowingForUser,
  listFollowAlertsForUser,
  listRecentGameCommentsForPlayer,
  listRecentUploadsForPlayer,
  listSupportRequestsForPlayer,
  type AcceptedAnswerSummary,
  type CommunitySummary,
  type FollowAlertSummary,
  type FollowConnectionSummary,
  type GameCommentSummary,
  type RecentUploadSummary,
  type SupportRequestSummary,
  type UserProfileSummary,
} from "@/lib/dashboard";

const TABS = [
  {
    id: "overview",
    label: "Overview",
    title: "Community chess, in motion.",
    description: "A single workspace for uploads, follows, comments, and the hard moves worth discussing.",
  },
  {
    id: "games",
    label: "Games",
    title: "Games and comments.",
    description: "Upload from your side, then let the room comment, ask, and sharpen the ideas around it.",
  },
  {
    id: "support",
    label: "Support",
    title: "Flagged moves and answers.",
    description: "The engine points at the move. The community explains why it matters.",
  },
  {
    id: "community",
    label: "Community",
    title: "Rooms, follows, and post alerts.",
    description: "Communities define the space; follows tell you when the people you care about publish something new.",
  },
  {
    id: "profile",
    label: "Profile",
    title: "Identity and connections.",
    description: "Your public face in Prism: player anchor, community home, followers, and the people you follow.",
  },
] as const;

type DashboardTab = (typeof TABS)[number]["id"];
type DashboardTabConfig = (typeof TABS)[number];

function resolveTab(tab?: string): DashboardTab {
  if (TABS.some((item) => item.id === tab)) {
    return tab as DashboardTab;
  }

  return "overview";
}

function getTabConfig(tab: DashboardTab): DashboardTabConfig {
  return TABS.find((item) => item.id === tab) ?? TABS[0];
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/^\w/, (character) => character.toUpperCase());
}

function formatMemberLimit(limit: number | null) {
  return limit === null ? "Unlimited members" : `${limit} members`;
}

function formatDate(value: Date | string | null) {
  if (!value) {
    return "Recently";
  }

  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatResult(result: RecentUploadSummary["playerResult"]) {
  switch (result) {
    case "win":
      return "Win";
    case "loss":
      return "Loss";
    case "draw":
      return "Draw";
    default:
      return "Unfinished";
  }
}

function metricTone(tone: "neutral" | "accent" | "success" | "warm" | "social") {
  switch (tone) {
    case "accent":
      return "bg-[rgba(0,113,227,0.08)] text-[#0f4da8]";
    case "success":
      return "bg-[rgba(29,135,84,0.1)] text-[#18633f]";
    case "warm":
      return "bg-[rgba(199,117,34,0.1)] text-[#8d5318]";
    case "social":
      return "bg-[rgba(28,103,107,0.1)] text-[#1b5f63]";
    default:
      return "bg-black/[0.045] text-[#46464d]";
  }
}

function statusTone(
  value:
    | RecentUploadSummary["analysisStatus"]
    | SupportRequestSummary["status"]
    | RecentUploadSummary["playerResult"],
) {
  switch (value) {
    case "ready":
    case "resolved":
    case "win":
      return "bg-[rgba(29,135,84,0.1)] text-[#18633f]";
    case "pending":
    case "running":
    case "in_review":
    case "draw":
      return "bg-[rgba(199,117,34,0.1)] text-[#8d5318]";
    case "failed":
    case "loss":
    case "archived":
      return "bg-[rgba(186,43,59,0.1)] text-[#8d1d2f]";
    default:
      return "bg-[rgba(0,113,227,0.08)] text-[#0f4da8]";
  }
}

function ShellCard({
  eyebrow,
  title,
  description,
  children,
  className = "",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "rounded-[28px] border border-black/8 bg-white/82 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur",
        className,
      ].join(" ")}
    >
      <header className="space-y-2">
        <p className="text-[0.74rem] font-medium tracking-[0.01em] text-black/42">
          {eyebrow}
        </p>
        <h2 className="text-[1.2rem] tracking-[-0.04em] text-[#111114]">
          {title}
        </h2>
        {description ? (
          <p className="max-w-[42rem] text-[0.94rem] leading-7 text-[var(--color-muted)]">
            {description}
          </p>
        ) : null}
      </header>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "accent" | "success" | "warm" | "social";
}) {
  return (
    <article className="rounded-[22px] border border-black/7 bg-white/72 p-5">
      <p className="text-[0.74rem] font-medium tracking-[0.01em] text-black/42">
        {label}
      </p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-[2rem] tracking-[-0.06em] text-[#111114]">{value}</p>
        <span
          className={[
            "inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-medium tracking-[0.01em]",
            metricTone(tone),
          ].join(" ")}
        >
          {label}
        </span>
      </div>
    </article>
  );
}

function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[22px] border border-dashed border-black/10 bg-black/[0.018] p-5">
      <p className="text-[0.98rem] tracking-[-0.03em] text-[#111114]">{title}</p>
      <p className="mt-2 max-w-[34rem] text-[0.92rem] leading-7 text-[var(--color-muted)]">
        {body}
      </p>
    </div>
  );
}

function SidebarLink({
  tab,
  activeTab,
}: {
  tab: DashboardTabConfig;
  activeTab: DashboardTab;
}) {
  const isActive = tab.id === activeTab;

  return (
    <Link
      href={tab.id === "overview" ? "/dashboard" : `/dashboard?tab=${tab.id}`}
      className={[
        "flex items-center justify-between rounded-[18px] px-4 py-3 text-[0.95rem] tracking-[-0.02em] transition duration-200",
        isActive
          ? "bg-[rgba(0,113,227,0.08)] text-[#0f4da8]"
          : "text-[var(--color-muted)] hover:bg-black/[0.03] hover:text-[#111114]",
      ].join(" ")}
    >
      <span>{tab.label}</span>
      <span className="text-[0.72rem]">{isActive ? "●" : ""}</span>
    </Link>
  );
}

function RecentUploadsList({ uploads }: { uploads: RecentUploadSummary[] }) {
  if (uploads.length === 0) {
    return (
      <EmptyState
        title="No games yet."
        body="Upload the first game from your side, then open it up for comments and support."
      />
    );
  }

  return (
    <div className="grid gap-3">
      {uploads.map((upload) => (
        <article
          key={upload.id}
          className="rounded-[22px] border border-black/7 bg-black/[0.018] p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[1rem] tracking-[-0.03em] text-[#111114]">
                {upload.openingName || "Untitled game"}
              </p>
              <p className="text-[0.9rem] leading-6 text-[var(--color-muted)]">
                {upload.playerColor === "white" ? "White" : "Black"} vs. {upload.opponentName}
              </p>
            </div>
            <p className="text-[0.82rem] tracking-[-0.02em] text-[var(--color-muted)]">
              {formatDate(upload.playedAt)}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className={[
                "inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-medium",
                statusTone(upload.playerResult),
              ].join(" ")}
            >
              {formatResult(upload.playerResult)}
            </span>
            <span
              className={[
                "inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-medium",
                statusTone(upload.analysisStatus),
              ].join(" ")}
            >
              {formatLabel(upload.analysisStatus)}
            </span>
            <span className="inline-flex rounded-full bg-black/[0.045] px-2.5 py-1 text-[0.72rem] font-medium text-[#46464d]">
              {upload.supportRequestCount} flagged moves
            </span>
            <span className="inline-flex rounded-full bg-black/[0.045] px-2.5 py-1 text-[0.72rem] font-medium text-[#46464d]">
              {upload.commentCount} comments
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function SupportRequestList({ requests }: { requests: SupportRequestSummary[] }) {
  if (requests.length === 0) {
    return (
      <EmptyState
        title="No flagged moves yet."
        body="When a move looks absurd, mark the ply and ask the room what the engine is actually preparing."
      />
    );
  }

  return (
    <div className="grid gap-3">
      {requests.map((request) => (
        <article
          key={request.id}
          className="rounded-[22px] border border-black/7 bg-black/[0.018] p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[1rem] tracking-[-0.03em] text-[#111114]">
                {request.label}
              </p>
              <p className="text-[0.9rem] leading-6 text-[var(--color-muted)]">
                {request.communityName} · Ply {request.focusPlyNumber}
                {request.openingName ? ` · ${request.openingName}` : ""}
              </p>
            </div>
            <span
              className={[
                "inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-medium",
                statusTone(request.status),
              ].join(" ")}
            >
              {formatLabel(request.status)}
            </span>
          </div>

          <p className="mt-3 text-[0.93rem] leading-7 text-[#25252b]">
            {request.questionText}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex rounded-full bg-[rgba(0,113,227,0.08)] px-2.5 py-1 text-[0.72rem] font-medium text-[#0f4da8]">
              {formatLabel(request.supportKind)}
            </span>
            <span className="inline-flex rounded-full bg-black/[0.045] px-2.5 py-1 text-[0.72rem] font-medium text-[#46464d]">
              {request.bestMoveSan ? `Engine ${request.bestMoveSan}` : "Engine line pending"}
            </span>
            <span className="inline-flex rounded-full bg-black/[0.045] px-2.5 py-1 text-[0.72rem] font-medium text-[#46464d]">
              {request.answerCount} answers
            </span>
            {request.hasGenerallyAccepted ? (
              <span className="inline-flex rounded-full bg-[rgba(29,135,84,0.1)] px-2.5 py-1 text-[0.72rem] font-medium text-[#18633f]">
                Generally accepted
              </span>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function AcceptedAnswersList({ answers }: { answers: AcceptedAnswerSummary[] }) {
  if (answers.length === 0) {
    return (
      <EmptyState
        title="No accepted answers yet."
        body="When the room converges on the clearest explanation, it will surface here."
      />
    );
  }

  return (
    <div className="grid gap-3">
      {answers.map((answer) => (
        <article
          key={answer.id}
          className="rounded-[22px] border border-black/7 bg-black/[0.018] p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[1rem] tracking-[-0.03em] text-[#111114]">
                {answer.label}
              </p>
              <p className="text-[0.9rem] leading-6 text-[var(--color-muted)]">
                {answer.communityName} · Ply {answer.focusPlyNumber} · by @{answer.authorUsername}
              </p>
            </div>
            <span className="inline-flex rounded-full bg-[rgba(29,135,84,0.1)] px-2.5 py-1 text-[0.72rem] font-medium text-[#18633f]">
              Accepted
            </span>
          </div>

          <p className="mt-3 text-[0.93rem] leading-7 text-[#25252b]">
            {answer.body}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex rounded-full bg-black/[0.045] px-2.5 py-1 text-[0.72rem] font-medium text-[#46464d]">
              {answer.engineBestMoveSan
                ? `Engine ${answer.engineBestMoveSan}`
                : "No engine move attached"}
            </span>
            {answer.proposedMoveSan ? (
              <span className="inline-flex rounded-full bg-[rgba(0,113,227,0.08)] px-2.5 py-1 text-[0.72rem] font-medium text-[#0f4da8]">
                Proposed {answer.proposedMoveSan}
              </span>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function CommunityList({ communities }: { communities: CommunitySummary[] }) {
  if (communities.length === 0) {
    return (
      <EmptyState
        title="No communities yet."
        body="Create a private room first, then invite the people you want around the board."
      />
    );
  }

  return (
    <div className="grid gap-3">
      {communities.map((community) => (
        <article
          key={community.id}
          className="rounded-[22px] border border-black/7 bg-black/[0.018] p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[1rem] tracking-[-0.03em] text-[#111114]">
                {community.name}
              </p>
              <p className="text-[0.9rem] leading-6 text-[var(--color-muted)]">
                {community.visibility === "private" ? "Private room" : "Public room"} · {formatLabel(community.role)}
              </p>
            </div>
            <span
              className={[
                "inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-medium",
                community.visibility === "private"
                  ? "bg-black/[0.045] text-[#46464d]"
                  : "bg-[rgba(0,113,227,0.08)] text-[#0f4da8]",
              ].join(" ")}
            >
              {formatLabel(community.visibility)}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex rounded-full bg-black/[0.045] px-2.5 py-1 text-[0.72rem] font-medium text-[#46464d]">
              {community.memberCount} members
            </span>
            <span className="inline-flex rounded-full bg-black/[0.045] px-2.5 py-1 text-[0.72rem] font-medium text-[#46464d]">
              {community.sharedGameCount} shared games
            </span>
            <span className="inline-flex rounded-full bg-black/[0.045] px-2.5 py-1 text-[0.72rem] font-medium text-[#46464d]">
              {formatMemberLimit(community.memberLimit)}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function FollowConnectionList({
  connections,
  emptyTitle,
  emptyBody,
}: {
  connections: FollowConnectionSummary[];
  emptyTitle: string;
  emptyBody: string;
}) {
  if (connections.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} />;
  }

  return (
    <div className="grid gap-3">
      {connections.map((connection) => (
        <article
          key={connection.userId}
          className="rounded-[22px] border border-black/7 bg-black/[0.018] p-4"
        >
          <div className="space-y-1">
            <p className="text-[1rem] tracking-[-0.03em] text-[#111114]">
              {connection.displayName}
            </p>
            <p className="text-[0.9rem] leading-6 text-[var(--color-muted)]">
              @{connection.username}
              {connection.homeCommunityName ? ` · ${connection.homeCommunityName}` : ""}
            </p>
          </div>

          {connection.headline ? (
            <p className="mt-3 text-[0.93rem] leading-7 text-[#25252b]">
              {connection.headline}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex rounded-full bg-black/[0.045] px-2.5 py-1 text-[0.72rem] font-medium text-[#46464d]">
              {connection.postedGameCount} posts
            </span>
            <span className="inline-flex rounded-full bg-black/[0.045] px-2.5 py-1 text-[0.72rem] font-medium text-[#46464d]">
              {connection.communityCount} communities
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function FollowAlertsList({ alerts }: { alerts: FollowAlertSummary[] }) {
  if (alerts.length === 0) {
    return (
      <EmptyState
        title="No post alerts yet."
        body="Follow people whose games you want to keep up with. Their new posts will appear here."
      />
    );
  }

  return (
    <div className="grid gap-3">
      {alerts.map((alert) => (
        <article
          key={alert.communityGameId}
          className="rounded-[22px] border border-black/7 bg-black/[0.018] p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[1rem] tracking-[-0.03em] text-[#111114]">
                {alert.openingName || "New game post"}
              </p>
              <p className="text-[0.9rem] leading-6 text-[var(--color-muted)]">
                {alert.postedByDisplayName} · @{alert.postedByUsername} · {alert.communityName}
              </p>
            </div>
            <p className="text-[0.82rem] tracking-[-0.02em] text-[var(--color-muted)]">
              {formatDate(alert.createdAt)}
            </p>
          </div>

          <p className="mt-3 text-[0.93rem] leading-7 text-[#25252b]">
            {alert.note || `Shared a game against ${alert.opponentName}.`}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex rounded-full bg-[rgba(28,103,107,0.1)] px-2.5 py-1 text-[0.72rem] font-medium text-[#1b5f63]">
              Follow alert
            </span>
            <span className="inline-flex rounded-full bg-black/[0.045] px-2.5 py-1 text-[0.72rem] font-medium text-[#46464d]">
              {alert.commentCount} comments
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function GameCommentsList({ comments }: { comments: GameCommentSummary[] }) {
  if (comments.length === 0) {
    return (
      <EmptyState
        title="No game comments yet."
        body="Once games are shared, people can comment directly on them and keep the conversation attached to the board."
      />
    );
  }

  return (
    <div className="grid gap-3">
      {comments.map((comment) => (
        <article
          key={comment.id}
          className="rounded-[22px] border border-black/7 bg-black/[0.018] p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[1rem] tracking-[-0.03em] text-[#111114]">
                {comment.openingName || "Game comment"}
              </p>
              <p className="text-[0.9rem] leading-6 text-[var(--color-muted)]">
                {comment.authorDisplayName} · @{comment.authorUsername}
                {comment.communityName ? ` · ${comment.communityName}` : ""}
              </p>
            </div>
            <p className="text-[0.82rem] tracking-[-0.02em] text-[var(--color-muted)]">
              {formatDate(comment.createdAt)}
            </p>
          </div>

          <p className="mt-3 text-[0.93rem] leading-7 text-[#25252b]">
            {comment.body}
          </p>
        </article>
      ))}
    </div>
  );
}

function FollowComposerCard() {
  return (
    <ShellCard
      eyebrow="Follow people"
      title="Add someone to your feed"
      description="Following is Prism's lightweight friend graph. If post alerts are on, their new game posts appear in your dashboard."
    >
      <form action="/api/social/follow" method="post" className="grid gap-3">
        <input
          type="text"
          name="username"
          placeholder="username"
          className="min-h-11 rounded-[16px] border border-black/10 bg-white px-4 text-[0.95rem] outline-none transition focus:border-black/25"
          autoComplete="off"
          required
        />
        <input type="hidden" name="redirectTab" value="profile" />
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#111114] px-4 text-[0.95rem] font-medium text-white transition hover:bg-black/82"
        >
          Follow user
        </button>
      </form>
    </ShellCard>
  );
}

function GameCommentComposer({
  uploads,
  defaultTab,
}: {
  uploads: RecentUploadSummary[];
  defaultTab: "overview" | "games";
}) {
  return (
    <ShellCard
      eyebrow="Comment"
      title="Leave a note on a game"
      description="Comments attach directly to the game, so discussion stays close to the actual board and move order."
    >
      {uploads.length === 0 ? (
        <EmptyState
          title="No games available to comment on."
          body="Post a game first, then comments can start building around it."
        />
      ) : (
        <form action="/api/games/comments" method="post" className="grid gap-3">
          <label className="grid gap-2">
            <span className="text-[0.74rem] font-medium tracking-[0.01em] text-black/42">
              Game
            </span>
            <select
              name="gameId"
              className="min-h-11 rounded-[16px] border border-black/10 bg-white px-4 text-[0.95rem] outline-none transition focus:border-black/25"
              defaultValue={uploads[0]?.id}
            >
              {uploads.map((upload) => (
                <option key={upload.id} value={upload.id}>
                  {(upload.openingName || "Untitled game") +
                    ` · ${upload.playerColor === "white" ? "White" : "Black"} vs ${upload.opponentName}`}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-[0.74rem] font-medium tracking-[0.01em] text-black/42">
              Comment
            </span>
            <textarea
              name="body"
              rows={4}
              placeholder="Add a thought, question, or observation about the game."
              className="rounded-[16px] border border-black/10 bg-white px-4 py-3 text-[0.95rem] leading-7 outline-none transition focus:border-black/25"
              required
            />
          </label>

          <input type="hidden" name="redirectTab" value={defaultTab} />
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#111114] px-4 text-[0.95rem] font-medium text-white transition hover:bg-black/82"
          >
            Post comment
          </button>
        </form>
      )}
    </ShellCard>
  );
}

function GamePostComposer({
  communities,
  defaultTab,
}: {
  communities: CommunitySummary[];
  defaultTab: "overview" | "games";
}) {
  const activeCommunities = communities.filter((community) => community.status === "active");

  return (
    <ShellCard
      eyebrow="Post a game"
      title="Start a new study post"
      description="Create the game first, share it into a room, and let comments and follow alerts start from there."
    >
      {activeCommunities.length === 0 ? (
        <EmptyState
          title="No active community available."
          body="Join or create an active community before posting games into Prism."
        />
      ) : (
        <form action="/api/games/create" method="post" className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-[0.74rem] font-medium tracking-[0.01em] text-black/42">
                Opponent
              </span>
              <input
                type="text"
                name="opponentName"
                placeholder="Anonymous"
                className="min-h-11 rounded-[16px] border border-black/10 bg-white px-4 text-[0.95rem] outline-none transition focus:border-black/25"
                autoComplete="off"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-[0.74rem] font-medium tracking-[0.01em] text-black/42">
                Opening
              </span>
              <input
                type="text"
                name="openingName"
                placeholder="Sicilian Defense"
                className="min-h-11 rounded-[16px] border border-black/10 bg-white px-4 text-[0.95rem] outline-none transition focus:border-black/25"
                autoComplete="off"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-2">
              <span className="text-[0.74rem] font-medium tracking-[0.01em] text-black/42">
                Your color
              </span>
              <select
                name="playerColor"
                defaultValue="white"
                className="min-h-11 rounded-[16px] border border-black/10 bg-white px-4 text-[0.95rem] outline-none transition focus:border-black/25"
              >
                <option value="white">White</option>
                <option value="black">Black</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-[0.74rem] font-medium tracking-[0.01em] text-black/42">
                Result
              </span>
              <select
                name="playerResult"
                defaultValue="unfinished"
                className="min-h-11 rounded-[16px] border border-black/10 bg-white px-4 text-[0.95rem] outline-none transition focus:border-black/25"
              >
                <option value="unfinished">Unfinished</option>
                <option value="win">Win</option>
                <option value="draw">Draw</option>
                <option value="loss">Loss</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-[0.74rem] font-medium tracking-[0.01em] text-black/42">
                Community
              </span>
              <select
                name="communityId"
                defaultValue={activeCommunities[0]?.id}
                className="min-h-11 rounded-[16px] border border-black/10 bg-white px-4 text-[0.95rem] outline-none transition focus:border-black/25"
              >
                {activeCommunities.map((community) => (
                  <option key={community.id} value={community.id}>
                    {community.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-[0.74rem] font-medium tracking-[0.01em] text-black/42">
                Played on
              </span>
              <input
                type="date"
                name="playedAt"
                className="min-h-11 rounded-[16px] border border-black/10 bg-white px-4 text-[0.95rem] outline-none transition focus:border-black/25"
              />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-[0.74rem] font-medium tracking-[0.01em] text-black/42">
              Share note
            </span>
            <textarea
              name="note"
              rows={3}
              placeholder="What should the room look at first?"
              className="rounded-[16px] border border-black/10 bg-white px-4 py-3 text-[0.95rem] leading-7 outline-none transition focus:border-black/25"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-[0.74rem] font-medium tracking-[0.01em] text-black/42">
              PGN
            </span>
            <textarea
              name="pgnText"
              rows={6}
              placeholder="Paste PGN here, or leave it blank to create a manual discussion post."
              className="rounded-[16px] border border-black/10 bg-white px-4 py-3 font-mono text-[0.9rem] leading-7 outline-none transition focus:border-black/25"
            />
          </label>

          <input type="hidden" name="redirectTab" value={defaultTab} />
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#111114] px-4 text-[0.95rem] font-medium text-white transition hover:bg-black/82"
          >
            Post game
          </button>
        </form>
      )}
    </ShellCard>
  );
}

function OverviewTab({
  profile,
  playerDisplayName,
  stats,
  communities,
  uploads,
  requests,
  answers,
  alerts,
  comments,
}: {
  profile: UserProfileSummary;
  playerDisplayName: string;
  stats: Awaited<ReturnType<typeof getDashboardStats>>;
  communities: CommunitySummary[];
  uploads: RecentUploadSummary[];
  requests: SupportRequestSummary[];
  answers: AcceptedAnswerSummary[];
  alerts: FollowAlertSummary[];
  comments: GameCommentSummary[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Games" value={stats.gameCount} tone="neutral" />
        <MetricCard label="Open support" value={stats.openSupportCount} tone="accent" />
        <MetricCard label="Accepted answers" value={stats.acceptedAnswerCount} tone="success" />
        <MetricCard label="Followers" value={stats.followerCount} tone="social" />
        <MetricCard label="Following" value={stats.followingCount} tone="social" />
        <MetricCard label="Post alerts" value={stats.postAlertCount} tone="warm" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.85fr)]">
        <div className="grid gap-4">
          <ShellCard
            eyebrow="Profile"
            title={profile.displayName}
            description={profile.headline || "A Prism profile anchored by games, community, and shared study."}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-black/7 bg-black/[0.018] p-4">
                <p className="text-[0.74rem] font-medium tracking-[0.01em] text-black/42">
                  Player anchor
                </p>
                <p className="mt-3 text-[1rem] tracking-[-0.03em] text-[#111114]">
                  {playerDisplayName}
                </p>
              </div>
              <div className="rounded-[22px] border border-black/7 bg-black/[0.018] p-4">
                <p className="text-[0.74rem] font-medium tracking-[0.01em] text-black/42">
                  Home community
                </p>
                <p className="mt-3 text-[1rem] tracking-[-0.03em] text-[#111114]">
                  {profile.homeCommunityName || "Not set"}
                </p>
              </div>
              <div className="rounded-[22px] border border-black/7 bg-black/[0.018] p-4">
                <p className="text-[0.74rem] font-medium tracking-[0.01em] text-black/42">
                  Comments written
                </p>
                <p className="mt-3 text-[1rem] tracking-[-0.03em] text-[#111114]">
                  {profile.commentCount}
                </p>
              </div>
            </div>
            {profile.bio ? (
              <p className="mt-4 max-w-[42rem] text-[0.95rem] leading-7 text-[var(--color-muted)]">
                {profile.bio}
              </p>
            ) : null}
          </ShellCard>

          <ShellCard
            eyebrow="Flow"
            title="How Prism works now"
            description="Community is part of the core model, not a side feature."
          >
            <div className="grid gap-3">
              {[
                "Post a game from your side of the board.",
                "Share it to a room or let followers see the post.",
                "Keep comments attached directly to the game.",
                "Flag the moves that still need a real explanation.",
              ].map((line) => (
                <div key={line} className="rounded-[18px] bg-black/[0.018] px-4 py-3 text-[0.92rem] text-[#111114]">
                  {line}
                </div>
              ))}
            </div>
          </ShellCard>
        </div>

        <GamePostComposer communities={communities} defaultTab="overview" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ShellCard
          eyebrow="Recent uploads"
          title="Games you posted"
          description="Your current game stream, with comments and support requests visible at a glance."
        >
          <RecentUploadsList uploads={uploads} />
        </ShellCard>

        <ShellCard
          eyebrow="Follow alerts"
          title="People you follow"
          description="Their latest posts show up here so you can keep up without chasing every community."
        >
          <FollowAlertsList alerts={alerts} />
        </ShellCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <ShellCard
          eyebrow="Game comments"
          title="Latest conversation"
          description="Comments stay attached to the game, which makes the discussion easy to revisit."
        >
          <GameCommentsList comments={comments} />
        </ShellCard>

        <ShellCard
          eyebrow="Support"
          title="Active flagged moves"
          description="The places where the engine is ahead of human intuition."
        >
          <SupportRequestList requests={requests} />
        </ShellCard>

        <ShellCard
          eyebrow="Accepted answers"
          title="What the room agrees on"
          description="The explanations that have actually settled into something reusable."
        >
          <AcceptedAnswersList answers={answers} />
        </ShellCard>

        <GameCommentComposer uploads={uploads} defaultTab="overview" />
      </div>
    </div>
  );
}

function GamesTab({
  communities,
  uploads,
  comments,
  stats,
}: {
  communities: CommunitySummary[];
  uploads: RecentUploadSummary[];
  comments: GameCommentSummary[];
  stats: Awaited<ReturnType<typeof getDashboardStats>>;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.85fr)]">
      <ShellCard
        eyebrow="Games"
        title="Your upload stream"
        description="Every game belongs to your player profile, can collect comments, and can branch into support requests when the idea is still unclear."
      >
        <RecentUploadsList uploads={uploads} />
      </ShellCard>

      <div className="grid gap-4">
        <GamePostComposer communities={communities} defaultTab="games" />

        <ShellCard
          eyebrow="Comments"
          title="Recent game comments"
          description="A direct comment layer on games makes discussion faster than forcing everything into a separate thread model."
        >
          <GameCommentsList comments={comments} />
        </ShellCard>

        <GameCommentComposer uploads={uploads} defaultTab="games" />

        <ShellCard
          eyebrow="Snapshot"
          title="Posting health"
          description="A compact read on games and discussion."
        >
          <div className="grid gap-3">
            <div className="flex items-center justify-between rounded-[18px] bg-black/[0.018] px-4 py-3">
              <span className="text-[0.92rem] text-[var(--color-muted)]">Games posted</span>
              <span className="text-[1rem] tracking-[-0.03em] text-[#111114]">{stats.gameCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-[18px] bg-black/[0.018] px-4 py-3">
              <span className="text-[0.92rem] text-[var(--color-muted)]">Comments on your games</span>
              <span className="text-[1rem] tracking-[-0.03em] text-[#111114]">{stats.commentCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-[18px] bg-black/[0.018] px-4 py-3">
              <span className="text-[0.92rem] text-[var(--color-muted)]">Review-ready games</span>
              <span className="text-[1rem] tracking-[-0.03em] text-[#111114]">{stats.readyReviewCount}</span>
            </div>
          </div>
        </ShellCard>
      </div>
    </div>
  );
}

function SupportTab({
  stats,
  requests,
  answers,
}: {
  stats: Awaited<ReturnType<typeof getDashboardStats>>;
  requests: SupportRequestSummary[];
  answers: AcceptedAnswerSummary[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Open support" value={stats.openSupportCount} tone="accent" />
        <MetricCard label="Accepted answers" value={stats.acceptedAnswerCount} tone="success" />
        <MetricCard label="Review queue" value={stats.reviewQueueCount} tone="warm" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.9fr)]">
        <ShellCard
          eyebrow="Support requests"
          title="Questions tied to exact moves"
          description="A move can be puzzling even when the engine is certain. These requests keep the question pinned to the exact ply."
        >
          <SupportRequestList requests={requests} />
        </ShellCard>

        <ShellCard
          eyebrow="Accepted answers"
          title="Settled explanations"
          description="This is where the room's best understanding accumulates."
        >
          <AcceptedAnswersList answers={answers} />
        </ShellCard>
      </div>
    </div>
  );
}

function CommunityTab({
  communities,
  alerts,
  followers,
}: {
  communities: CommunitySummary[];
  alerts: FollowAlertSummary[];
  followers: FollowConnectionSummary[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
      <ShellCard
        eyebrow="Communities"
        title="Rooms with structure"
        description="Communities now own shared games, comments, support requests, and the people around those discussions."
      >
        <CommunityList communities={communities} />
      </ShellCard>

      <div className="grid gap-4">
        <ShellCard
          eyebrow="Post alerts"
          title="Follow feed"
          description="Following works like a lightweight friend graph. If you follow someone and keep post alerts on, their new games surface here."
        >
          <FollowAlertsList alerts={alerts} />
        </ShellCard>

        <ShellCard
          eyebrow="Audience"
          title="People watching your work"
          description="Followers are the people likely to see and respond when you post something worth discussing."
        >
          <FollowConnectionList
            connections={followers}
            emptyTitle="No followers yet."
            emptyBody="As your comments and posts become useful, this list will start to fill out."
          />
        </ShellCard>

        <FollowComposerCard />
      </div>
    </div>
  );
}

function ProfileTab({
  profile,
  playerDisplayName,
  following,
  followers,
  communities,
}: {
  profile: UserProfileSummary;
  playerDisplayName: string;
  following: FollowConnectionSummary[];
  followers: FollowConnectionSummary[];
  communities: CommunitySummary[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <ShellCard
          eyebrow="Profile"
          title={profile.displayName}
          description={profile.headline || "A community-facing chess profile."}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[18px] bg-black/[0.018] px-4 py-3">
              <p className="text-[0.74rem] font-medium tracking-[0.01em] text-black/42">
                Username
              </p>
              <p className="mt-2 text-[1rem] tracking-[-0.03em] text-[#111114]">
                @{profile.username}
              </p>
            </div>
            <div className="rounded-[18px] bg-black/[0.018] px-4 py-3">
              <p className="text-[0.74rem] font-medium tracking-[0.01em] text-black/42">
                Player anchor
              </p>
              <p className="mt-2 text-[1rem] tracking-[-0.03em] text-[#111114]">
                {playerDisplayName}
              </p>
            </div>
            <div className="rounded-[18px] bg-black/[0.018] px-4 py-3">
              <p className="text-[0.74rem] font-medium tracking-[0.01em] text-black/42">
                Home community
              </p>
              <p className="mt-2 text-[1rem] tracking-[-0.03em] text-[#111114]">
                {profile.homeCommunityName || "Not set"}
              </p>
            </div>
            <div className="rounded-[18px] bg-black/[0.018] px-4 py-3">
              <p className="text-[0.74rem] font-medium tracking-[0.01em] text-black/42">
                Posts
              </p>
              <p className="mt-2 text-[1rem] tracking-[-0.03em] text-[#111114]">
                {profile.postedGameCount}
              </p>
            </div>
          </div>

          {profile.bio ? (
            <p className="mt-4 max-w-[44rem] text-[0.95rem] leading-7 text-[var(--color-muted)]">
              {profile.bio}
            </p>
          ) : null}
        </ShellCard>

        <ShellCard
          eyebrow="Social graph"
          title="Connections"
          description="Profiles are now tied directly into follows and community presence."
        >
          <div className="grid gap-3">
            <div className="flex items-center justify-between rounded-[18px] bg-black/[0.018] px-4 py-3">
              <span className="text-[0.92rem] text-[var(--color-muted)]">Followers</span>
              <span className="text-[1rem] tracking-[-0.03em] text-[#111114]">{profile.followerCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-[18px] bg-black/[0.018] px-4 py-3">
              <span className="text-[0.92rem] text-[var(--color-muted)]">Following</span>
              <span className="text-[1rem] tracking-[-0.03em] text-[#111114]">{profile.followingCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-[18px] bg-black/[0.018] px-4 py-3">
              <span className="text-[0.92rem] text-[var(--color-muted)]">Communities</span>
              <span className="text-[1rem] tracking-[-0.03em] text-[#111114]">{profile.communityCount}</span>
            </div>
          </div>
        </ShellCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ShellCard
          eyebrow="Following"
          title="People you keep up with"
          description="A lightweight friend graph with post alerts."
        >
          <FollowConnectionList
            connections={following}
            emptyTitle="You are not following anyone yet."
            emptyBody="Follow people whose games and explanations you want to keep seeing."
          />
        </ShellCard>

        <ShellCard
          eyebrow="Followers"
          title="People following you"
          description="These users want to know when you post."
        >
          <FollowConnectionList
            connections={followers}
            emptyTitle="No followers yet."
            emptyBody="Useful posts and comments are the best way to build this list."
          />
        </ShellCard>

        <ShellCard
          eyebrow="Communities"
          title="Your rooms"
          description="The spaces your profile currently belongs to."
        >
          <CommunityList communities={communities} />
        </ShellCard>
      </div>

      <FollowComposerCard />
    </div>
  );
}

function TabPanel({
  tab,
  profile,
  playerDisplayName,
  stats,
  communities,
  uploads,
  requests,
  answers,
  following,
  followers,
  alerts,
  comments,
}: {
  tab: DashboardTab;
  profile: UserProfileSummary;
  playerDisplayName: string;
  stats: Awaited<ReturnType<typeof getDashboardStats>>;
  communities: CommunitySummary[];
  uploads: RecentUploadSummary[];
  requests: SupportRequestSummary[];
  answers: AcceptedAnswerSummary[];
  following: FollowConnectionSummary[];
  followers: FollowConnectionSummary[];
  alerts: FollowAlertSummary[];
  comments: GameCommentSummary[];
}) {
  if (tab === "games") {
    return <GamesTab communities={communities} uploads={uploads} comments={comments} stats={stats} />;
  }

  if (tab === "support") {
    return <SupportTab stats={stats} requests={requests} answers={answers} />;
  }

  if (tab === "community") {
    return <CommunityTab communities={communities} alerts={alerts} followers={followers} />;
  }

  if (tab === "profile") {
    return (
      <ProfileTab
        profile={profile}
        playerDisplayName={playerDisplayName}
        following={following}
        followers={followers}
        communities={communities}
      />
    );
  }

  return (
    <OverviewTab
      profile={profile}
      playerDisplayName={playerDisplayName}
      stats={stats}
      communities={communities}
      uploads={uploads}
      requests={requests}
      answers={answers}
      alerts={alerts}
      comments={comments}
    />
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const player = await getPrimaryPlayerForUser(user.id);

  if (!player) {
    throw new Error(`Primary player missing for user ${user.id}.`);
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const activeTab = resolveTab(resolvedSearchParams?.tab);
  const activeConfig = getTabConfig(activeTab);

  const [
    stats,
    profileSummary,
    communities,
    uploads,
    requests,
    answers,
    following,
    followers,
    alerts,
    comments,
  ] = await Promise.all([
    getDashboardStats(user.id, player.id),
    getUserProfileSummary(user.id),
    listCommunitiesForUser(user.id),
    listRecentUploadsForPlayer(player.id),
    listSupportRequestsForPlayer(player.id),
    listAcceptedAnswersForPlayer(player.id),
    listFollowingForUser(user.id),
    listFollowersForUser(user.id),
    listFollowAlertsForUser(user.id),
    listRecentGameCommentsForPlayer(player.id),
  ]);

  const profile: UserProfileSummary = profileSummary ?? {
    userId: user.id,
    username: user.username,
    email: user.email,
    displayName: player.displayName,
    headline: null,
    bio: null,
    homeCommunityName: communities[0]?.name ?? null,
    followerCount: stats.followerCount,
    followingCount: stats.followingCount,
    communityCount: stats.communityCount,
    postedGameCount: stats.gameCount,
    commentCount: stats.commentCount,
  };

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-4 py-4 text-[var(--color-ink)] sm:px-6 lg:px-8 lg:py-8">
      <section className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1400px] gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="rounded-[30px] border border-black/8 bg-white/82 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur sm:p-5">
          <div className="flex h-full flex-col gap-5">
            <div className="space-y-2 px-1 pt-1">
              <p className="text-[1.85rem] tracking-[-0.07em] text-[#0f1014]">Prism.</p>
              <p className="max-w-[12rem] text-[0.88rem] leading-6 text-[var(--color-muted)]">
                Chess community, commentary, and hard-move explanation.
              </p>
            </div>

            <div className="rounded-[24px] border border-black/8 bg-black/[0.022] p-4">
              <p className="text-[0.74rem] font-medium tracking-[0.01em] text-black/42">
                Profile
              </p>
              <p className="mt-3 text-[1.12rem] tracking-[-0.04em] text-[#111114]">
                {profile.displayName}
              </p>
              <p className="mt-1 text-[0.88rem] leading-6 text-[var(--color-muted)]">
                @{profile.username}
              </p>
              {profile.homeCommunityName ? (
                <p className="mt-3 text-[0.82rem] leading-6 text-[var(--color-muted)]">
                  Home community: {profile.homeCommunityName}
                </p>
              ) : null}
            </div>

            <nav className="grid gap-1">
              {TABS.map((tab) => (
                <SidebarLink key={tab.id} tab={tab} activeTab={activeTab} />
              ))}
            </nav>

            <div className="mt-auto rounded-[24px] border border-black/8 bg-[rgba(0,113,227,0.08)] p-4">
              <p className="text-[0.74rem] font-medium tracking-[0.01em] text-[#0f4da8]">
                Social loop
              </p>
              <p className="mt-3 text-[0.9rem] leading-7 text-[#174ea6]">
                Post the game, let people comment, then flag the move that still needs a real human explanation.
              </p>

              <form action="/api/auth/logout" method="post" className="mt-4">
                <button
                  className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#0f4da8]/12 bg-white/80 px-4 text-[0.92rem] font-medium tracking-[-0.02em] text-[#0f4da8] transition duration-200 hover:bg-white"
                  type="submit"
                >
                  Log out
                </button>
              </form>
            </div>
          </div>
        </aside>

        <section className="min-h-0 rounded-[34px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.8))] shadow-[0_20px_70px_rgba(15,23,42,0.07)] backdrop-blur">
          <div className="flex h-full min-h-0 flex-col">
            <header className="border-b border-black/8 px-6 py-6 sm:px-8 sm:py-7">
              <p className="text-[0.76rem] font-medium tracking-[0.01em] text-black/42">
                {activeConfig.label}
              </p>
              <h1 className="mt-2 text-[clamp(2rem,4vw,3.2rem)] leading-[0.95] tracking-[-0.07em] text-[#0f1014]">
                {activeConfig.title}
              </h1>
              <p className="mt-3 max-w-[48rem] text-[1rem] leading-7 text-[var(--color-muted)]">
                {activeConfig.description}
              </p>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8">
              <TabPanel
                tab={activeTab}
                profile={profile}
                playerDisplayName={player.displayName}
                stats={stats}
                communities={communities}
                uploads={uploads}
                requests={requests}
                answers={answers}
                following={following}
                followers={followers}
                alerts={alerts}
                comments={comments}
              />
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
