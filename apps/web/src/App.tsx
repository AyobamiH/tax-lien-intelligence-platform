import { useEffect, useMemo, useState } from "react";
import type {
  AuthUserResponse,
  DatasetResponse,
  PortfolioItemResponse,
  PortfolioStatus,
  ScoredRecordResponse,
  WatchlistItemResponse,
} from "@tax-lien/types";
import {
  ApiClientError,
  addPortfolioItem,
  addWatchlistItem,
  getCurrentUser,
  getDataset,
  listDatasets,
  listDatasetScores,
  listPortfolio,
  listWatchlist,
  login,
  register,
  removePortfolioItem,
  removeWatchlistItem,
  scoreDataset,
  updatePortfolioItemStatus,
} from "./api";
import {
  buildPortfolioByScoreId,
  buildPortfolioByWatchlistId,
  buildWatchlistByScoreId,
  filterScoresForReview,
  flagPreview,
  formatMoney,
  formatPercent,
  formatRatio,
  portfolioStatusClassName,
  portfolioStatusLabel,
  portfolioStatusOptions,
  primaryRecordLabel,
  reasoningPreview,
  scoreBand,
  sortPortfolioItemsForReview,
  sortWatchlistItemsForReview,
  type ScoreFilter,
  summarizeScores,
} from "./review-model";

const authStorageKey = "tax-lien-review-session";

type PageState =
  | { name: "datasets" }
  | { name: "dataset"; datasetId: string }
  | { name: "watchlist" }
  | { name: "portfolio" };

type AuthMode = "login" | "register";

interface StoredSession {
  token: string;
  user: AuthUserResponse;
}

interface DatasetDetailState {
  dataset: DatasetResponse | null;
  scores: ScoredRecordResponse[];
  selectedScoreId: string | null;
  isLoading: boolean;
  isScoring: boolean;
  error: string | null;
}

interface WatchlistState {
  items: WatchlistItemResponse[];
  isLoading: boolean;
  error: string | null;
  actionId: string | null;
}

interface PortfolioState {
  items: PortfolioItemResponse[];
  isLoading: boolean;
  error: string | null;
  actionId: string | null;
}

function App() {
  const [session, setSession] = useState<StoredSession | null>(() => loadStoredSession());
  const [page, setPage] = useState<PageState>(() => readRoute());
  const [datasets, setDatasets] = useState<DatasetResponse[]>([]);
  const [datasetsLoading, setDatasetsLoading] = useState(false);
  const [datasetsError, setDatasetsError] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistState>({
    items: [],
    isLoading: false,
    error: null,
    actionId: null,
  });
  const [portfolio, setPortfolio] = useState<PortfolioState>({
    items: [],
    isLoading: false,
    error: null,
    actionId: null,
  });
  const authToken = session?.token ?? null;

  useEffect(() => {
    const handlePopState = () => setPage(readRoute());
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    void refreshSession(session.token, setSession);
  }, [session?.token]);

  useEffect(() => {
    if (!authToken) {
      setDatasets([]);
      setWatchlist({
        items: [],
        isLoading: false,
        error: null,
        actionId: null,
      });
      setPortfolio({
        items: [],
        isLoading: false,
        error: null,
        actionId: null,
      });
      return;
    }

    setDatasetsLoading(true);
    setDatasetsError(null);

    listDatasets(authToken)
      .then((result) => {
        setDatasets(result.datasets);
      })
      .catch((error: unknown) => {
        setDatasetsError(errorMessage(error));
        if (isAuthError(error)) {
          clearSession(setSession);
        }
      })
      .finally(() => setDatasetsLoading(false));
  }, [authToken]);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    void refreshWatchlist(authToken);
    void refreshPortfolio(authToken);
  }, [authToken]);

  function handleSignedIn(nextSession: StoredSession): void {
    sessionStorage.setItem(authStorageKey, JSON.stringify(nextSession));
    setSession(nextSession);
    navigate({ name: "datasets" }, setPage);
  }

  function handleSignOut(): void {
    clearSession(setSession);
    navigate({ name: "datasets" }, setPage);
  }

  async function refreshWatchlist(token: string): Promise<void> {
    setWatchlist((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const result = await listWatchlist(token);
      setWatchlist((current) => ({
        ...current,
        items: result.items,
        isLoading: false,
        error: null,
      }));
    } catch (error: unknown) {
      setWatchlist((current) => ({
        ...current,
        isLoading: false,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function refreshPortfolio(token: string): Promise<void> {
    setPortfolio((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const result = await listPortfolio(token);
      setPortfolio((current) => ({
        ...current,
        items: result.items,
        isLoading: false,
        error: null,
      }));
    } catch (error: unknown) {
      setPortfolio((current) => ({
        ...current,
        isLoading: false,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function addScoreToWatchlist(scoredRecordId: string): Promise<void> {
    if (!session) {
      return;
    }

    setWatchlist((current) => ({ ...current, actionId: scoredRecordId, error: null }));

    try {
      const result = await addWatchlistItem(session.token, scoredRecordId);
      setWatchlist((current) => {
        const withoutDuplicate = current.items.filter((item) => item.id !== result.item.id);
        return {
          ...current,
          items: sortWatchlistItemsForReview([result.item, ...withoutDuplicate]),
          actionId: null,
          error: null,
        };
      });
    } catch (error: unknown) {
      setWatchlist((current) => ({
        ...current,
        actionId: null,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function removeFromWatchlist(watchlistItemId: string): Promise<void> {
    if (!session) {
      return;
    }

    setWatchlist((current) => ({ ...current, actionId: watchlistItemId, error: null }));

    try {
      await removeWatchlistItem(session.token, watchlistItemId);
      setWatchlist((current) => ({
        ...current,
        items: current.items.filter((item) => item.id !== watchlistItemId),
        actionId: null,
        error: null,
      }));
    } catch (error: unknown) {
      setWatchlist((current) => ({
        ...current,
        actionId: null,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function addScoreToPortfolio(scoredRecordId: string): Promise<void> {
    if (!session) {
      return;
    }

    setPortfolio((current) => ({ ...current, actionId: scoredRecordId, error: null }));

    try {
      const result = await addPortfolioItem(session.token, { scoredRecordId });
      setPortfolio((current) => upsertPortfolioItem(current, result.item));
    } catch (error: unknown) {
      setPortfolio((current) => ({
        ...current,
        actionId: null,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function addWatchlistToPortfolio(watchlistItemId: string): Promise<void> {
    if (!session) {
      return;
    }

    setPortfolio((current) => ({ ...current, actionId: watchlistItemId, error: null }));

    try {
      const result = await addPortfolioItem(session.token, { watchlistItemId });
      setPortfolio((current) => upsertPortfolioItem(current, result.item));
    } catch (error: unknown) {
      setPortfolio((current) => ({
        ...current,
        actionId: null,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function updatePortfolioStatus(portfolioItemId: string, status: PortfolioStatus): Promise<void> {
    if (!session) {
      return;
    }

    setPortfolio((current) => ({ ...current, actionId: portfolioItemId, error: null }));

    try {
      const result = await updatePortfolioItemStatus(session.token, portfolioItemId, status);
      setPortfolio((current) => upsertPortfolioItem(current, result.item));
    } catch (error: unknown) {
      setPortfolio((current) => ({
        ...current,
        actionId: null,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function removeFromPortfolio(portfolioItemId: string): Promise<void> {
    if (!session) {
      return;
    }

    setPortfolio((current) => ({ ...current, actionId: portfolioItemId, error: null }));

    try {
      await removePortfolioItem(session.token, portfolioItemId);
      setPortfolio((current) => ({
        ...current,
        items: current.items.filter((item) => item.id !== portfolioItemId),
        actionId: null,
        error: null,
      }));
    } catch (error: unknown) {
      setPortfolio((current) => ({
        ...current,
        actionId: null,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  if (!session) {
    return <AuthScreen onSignedIn={handleSignedIn} />;
  }

  return (
    <main className="min-h-screen bg-field text-ink">
      <AppHeader
        user={session.user}
        page={page}
        watchlistCount={watchlist.items.length}
        portfolioCount={portfolio.items.length}
        onNavigate={(nextPage) => navigate(nextPage, setPage)}
        onSignOut={handleSignOut}
      />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[320px_1fr]">
        <DatasetListPanel
          datasets={datasets}
          isLoading={datasetsLoading}
          error={datasetsError}
          activeDatasetId={page.name === "dataset" ? page.datasetId : null}
          watchlistCount={watchlist.items.length}
          portfolioCount={portfolio.items.length}
          isWatchlistActive={page.name === "watchlist"}
          isPortfolioActive={page.name === "portfolio"}
          onSelect={(datasetId) => navigate({ name: "dataset", datasetId }, setPage)}
          onWatchlistSelect={() => navigate({ name: "watchlist" }, setPage)}
          onPortfolioSelect={() => navigate({ name: "portfolio" }, setPage)}
          onRetry={() => {
            setDatasetsLoading(true);
            setDatasetsError(null);
            listDatasets(session.token)
              .then((result) => setDatasets(result.datasets))
              .catch((error: unknown) => setDatasetsError(errorMessage(error)))
              .finally(() => setDatasetsLoading(false));
          }}
        />
        {page.name === "dataset" ? (
          <DatasetDetailPage
            token={session.token}
            datasetId={page.datasetId}
            watchlistItems={watchlist.items}
            watchlistActionId={watchlist.actionId}
            watchlistError={watchlist.error}
            portfolioItems={portfolio.items}
            portfolioActionId={portfolio.actionId}
            portfolioError={portfolio.error}
            onAddToWatchlist={(scoredRecordId) => void addScoreToWatchlist(scoredRecordId)}
            onRemoveFromWatchlist={(watchlistItemId) => void removeFromWatchlist(watchlistItemId)}
            onAddScoreToPortfolio={(scoredRecordId) => void addScoreToPortfolio(scoredRecordId)}
            onRemoveFromPortfolio={(portfolioItemId) => void removeFromPortfolio(portfolioItemId)}
          />
        ) : page.name === "watchlist" ? (
          <WatchlistPage
            items={watchlist.items}
            isLoading={watchlist.isLoading}
            error={watchlist.error}
            actionId={watchlist.actionId}
            portfolioItems={portfolio.items}
            portfolioActionId={portfolio.actionId}
            portfolioError={portfolio.error}
            onRetry={() => void refreshWatchlist(session.token)}
            onRemove={(watchlistItemId) => void removeFromWatchlist(watchlistItemId)}
            onTrack={(watchlistItemId) => void addWatchlistToPortfolio(watchlistItemId)}
          />
        ) : page.name === "portfolio" ? (
          <PortfolioPage
            items={portfolio.items}
            isLoading={portfolio.isLoading}
            error={portfolio.error}
            actionId={portfolio.actionId}
            onRetry={() => void refreshPortfolio(session.token)}
            onStatusChange={(portfolioItemId, status) => void updatePortfolioStatus(portfolioItemId, status)}
            onRemove={(portfolioItemId) => void removeFromPortfolio(portfolioItemId)}
          />
        ) : (
          <ReviewHome
            datasets={datasets}
            watchlistCount={watchlist.items.length}
            portfolioCount={portfolio.items.length}
            isLoading={datasetsLoading}
          />
        )}
      </div>
    </main>
  );
}

function AuthScreen({ onSignedIn }: { onSignedIn: (session: StoredSession) => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = mode === "login"
        ? await login({ email, password })
        : await register({ email, password });
      onSignedIn({ token: result.token, user: result.user });
    } catch (apiError: unknown) {
      setError(errorMessage(apiError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-field text-ink">
      <section className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1fr_420px]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-pine">
            Tax Lien Intelligence Platform
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl">
            Review scored lien opportunities with visible reasoning.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/75">
            Uploads, scoring runs, and scored records are served by the authenticated API.
            The browser shows only the signed-in user's datasets.
          </p>
        </div>
        <form onSubmit={(event) => void submit(event)} className="border border-line bg-white p-5 shadow-sm">
          <div className="flex border border-line text-sm font-medium">
            <button
              type="button"
              className={`flex-1 px-3 py-2 ${mode === "login" ? "bg-pine text-white" : "bg-white text-ink"}`}
              onClick={() => setMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={`flex-1 px-3 py-2 ${mode === "register" ? "bg-pine text-white" : "bg-white text-ink"}`}
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </div>
          <label className="mt-5 block text-sm font-semibold" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full border border-line px-3 py-2"
            required
          />
          <label className="mt-4 block text-sm font-semibold" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full border border-line px-3 py-2"
            required
          />
          {error ? (
            <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
          ) : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-5 w-full bg-pine px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Working..." : mode === "login" ? "Login" : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}

function AppHeader({
  user,
  page,
  watchlistCount,
  portfolioCount,
  onNavigate,
  onSignOut,
}: {
  user: AuthUserResponse;
  page: PageState;
  watchlistCount: number;
  portfolioCount: number;
  onNavigate: (page: PageState) => void;
  onSignOut: () => void;
}) {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pine">Tax Lien Intelligence</p>
          <h1 className="text-xl font-semibold">Dataset Review</h1>
        </div>
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => onNavigate({ name: "datasets" })}
            className={`border border-line px-3 py-2 font-medium ${
              page.name === "datasets" || page.name === "dataset" ? "bg-field" : "bg-white"
            }`}
          >
            Datasets
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ name: "watchlist" })}
            className={`border border-line px-3 py-2 font-medium ${page.name === "watchlist" ? "bg-field" : "bg-white"}`}
          >
            Watchlist ({watchlistCount})
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ name: "portfolio" })}
            className={`border border-line px-3 py-2 font-medium ${page.name === "portfolio" ? "bg-field" : "bg-white"}`}
          >
            Portfolio ({portfolioCount})
          </button>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="max-w-[220px] truncate text-ink/70">{user.email}</span>
          <button type="button" onClick={onSignOut} className="border border-line px-3 py-2 font-medium">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

function DatasetListPanel({
  datasets,
  isLoading,
  error,
  activeDatasetId,
  watchlistCount,
  portfolioCount,
  isWatchlistActive,
  isPortfolioActive,
  onSelect,
  onWatchlistSelect,
  onPortfolioSelect,
  onRetry,
}: {
  datasets: DatasetResponse[];
  isLoading: boolean;
  error: string | null;
  activeDatasetId: string | null;
  watchlistCount: number;
  portfolioCount: number;
  isWatchlistActive: boolean;
  isPortfolioActive: boolean;
  onSelect: (datasetId: string) => void;
  onWatchlistSelect: () => void;
  onPortfolioSelect: () => void;
  onRetry: () => void;
}) {
  return (
    <aside className="border border-line bg-white">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink/70">Datasets</h2>
      </div>
      <button
        type="button"
        onClick={onWatchlistSelect}
        className={`block w-full border-b border-line px-4 py-3 text-left hover:bg-field ${
          isWatchlistActive ? "bg-field" : "bg-white"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">Watchlist</span>
          <span className="border border-line px-2 py-1 text-xs">{watchlistCount} kept</span>
        </div>
        <p className="mt-1 text-xs text-ink/60">Compare records saved from scored results.</p>
      </button>
      <button
        type="button"
        onClick={onPortfolioSelect}
        className={`block w-full border-b border-line px-4 py-3 text-left hover:bg-field ${
          isPortfolioActive ? "bg-field" : "bg-white"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">Portfolio</span>
          <span className="border border-line px-2 py-1 text-xs">{portfolioCount} tracked</span>
        </div>
        <p className="mt-1 text-xs text-ink/60">Track active decisions and status.</p>
      </button>
      {isLoading ? <PanelMessage label="Loading datasets..." /> : null}
      {error ? <PanelError message={error} onRetry={onRetry} /> : null}
      {!isLoading && !error && datasets.length === 0 ? (
        <PanelMessage label="No datasets found. Upload a CSV through the dataset API to begin review." />
      ) : null}
      <div className="divide-y divide-line">
        {datasets.map((dataset) => (
          <button
            key={dataset.id}
            type="button"
            onClick={() => onSelect(dataset.id)}
            className={`block w-full px-4 py-3 text-left hover:bg-field ${
              activeDatasetId === dataset.id ? "bg-field" : "bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{dataset.sourceLabel ?? dataset.originalFilename}</p>
                <p className="mt-1 truncate text-xs text-ink/60">{dataset.originalFilename}</p>
              </div>
              <span className="shrink-0 border border-line px-2 py-1 text-xs">{dataset.rowCount} rows</span>
            </div>
            <p className="mt-2 text-xs text-ink/60">
              {dataset.validationSummary.validRows} valid / {dataset.validationSummary.invalidRows} invalid
            </p>
          </button>
        ))}
      </div>
    </aside>
  );
}

function ReviewHome({
  datasets,
  watchlistCount,
  portfolioCount,
  isLoading,
}: {
  datasets: DatasetResponse[];
  watchlistCount: number;
  portfolioCount: number;
  isLoading: boolean;
}) {
  return (
    <section className="border border-line bg-white p-6">
      <h2 className="text-2xl font-semibold">Scored Results Review</h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Datasets" value={isLoading ? "..." : String(datasets.length)} />
        <Metric label="Watchlist" value={String(watchlistCount)} />
        <Metric label="Portfolio" value={String(portfolioCount)} />
        <Metric
          label="Rows Uploaded"
          value={isLoading ? "..." : String(datasets.reduce((total, dataset) => total + dataset.rowCount, 0))}
        />
        <Metric
          label="Validation Warnings"
          value={isLoading ? "..." : String(datasets.reduce((total, dataset) => total + dataset.validationSummary.warnings.length, 0))}
        />
      </div>
      <div className="mt-6 border border-line bg-field p-4 text-sm text-ink/75">
        Select a dataset to review scoring status, run scoring, and inspect record-level reasoning.
      </div>
    </section>
  );
}

function DatasetDetailPage({
  token,
  datasetId,
  watchlistItems,
  watchlistActionId,
  watchlistError,
  portfolioItems,
  portfolioActionId,
  portfolioError,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  onAddScoreToPortfolio,
  onRemoveFromPortfolio,
}: {
  token: string;
  datasetId: string;
  watchlistItems: WatchlistItemResponse[];
  watchlistActionId: string | null;
  watchlistError: string | null;
  portfolioItems: PortfolioItemResponse[];
  portfolioActionId: string | null;
  portfolioError: string | null;
  onAddToWatchlist: (scoredRecordId: string) => void;
  onRemoveFromWatchlist: (watchlistItemId: string) => void;
  onAddScoreToPortfolio: (scoredRecordId: string) => void;
  onRemoveFromPortfolio: (portfolioItemId: string) => void;
}) {
  const [state, setState] = useState<DatasetDetailState>({
    dataset: null,
    scores: [],
    selectedScoreId: null,
    isLoading: true,
    isScoring: false,
    error: null,
  });
  const [filter, setFilter] = useState<ScoreFilter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setState({
      dataset: null,
      scores: [],
      selectedScoreId: null,
      isLoading: true,
      isScoring: false,
      error: null,
    });

    Promise.all([getDataset(token, datasetId), listDatasetScores(token, datasetId)])
      .then(([datasetResult, scoresResult]) => {
        setState({
          dataset: datasetResult.dataset,
          scores: scoresResult.scores,
          selectedScoreId: scoresResult.scores[0]?.id ?? null,
          isLoading: false,
          isScoring: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        setState((current) => ({
          ...current,
          isLoading: false,
          error: errorMessage(error),
        }));
      });
  }, [datasetId, token]);

  const visibleScores = useMemo(
    () => filterScoresForReview(state.scores, filter, query),
    [state.scores, filter, query],
  );
  const stats = useMemo(() => summarizeScores(state.scores), [state.scores]);
  const watchlistByScoreId = useMemo(() => buildWatchlistByScoreId(watchlistItems), [watchlistItems]);
  const portfolioByScoreId = useMemo(() => buildPortfolioByScoreId(portfolioItems), [portfolioItems]);
  const datasetWatchlistCount = state.scores.filter((score) => watchlistByScoreId.has(score.id)).length;
  const datasetPortfolioCount = state.scores.filter((score) => portfolioByScoreId.has(score.id)).length;
  const selectedScore = state.scores.find((score) => score.id === state.selectedScoreId) ?? visibleScores[0] ?? null;

  async function runScoring(): Promise<void> {
    setState((current) => ({ ...current, isScoring: true, error: null }));

    try {
      const result = await scoreDataset(token, datasetId);
      setState((current) => ({
        ...current,
        scores: result.scores,
        selectedScoreId: result.scores[0]?.id ?? null,
        isScoring: false,
      }));
    } catch (error: unknown) {
      setState((current) => ({
        ...current,
        isScoring: false,
        error: errorMessage(error),
      }));
    }
  }

  if (state.isLoading) {
    return <PanelMessage label="Loading dataset review..." />;
  }

  if (!state.dataset) {
    return <PanelError message={state.error ?? "Dataset could not be loaded."} />;
  }

  return (
    <section className="min-w-0 space-y-5">
      <div className="border border-line bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">Dataset</p>
            <h2 className="mt-1 truncate text-2xl font-semibold">{state.dataset.sourceLabel ?? state.dataset.originalFilename}</h2>
            <p className="mt-1 text-sm text-ink/60">{state.dataset.originalFilename}</p>
          </div>
          <button
            type="button"
            onClick={() => void runScoring()}
            disabled={state.isScoring}
            className="bg-pine px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state.isScoring ? "Scoring..." : state.scores.length > 0 ? "Re-run scoring" : "Run scoring"}
          </button>
        </div>
        {state.error ? (
          <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</div>
        ) : null}
        {watchlistError ? (
          <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{watchlistError}</div>
        ) : null}
        {portfolioError ? (
          <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{portfolioError}</div>
        ) : null}
        <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <Metric label="Rows" value={String(state.dataset.rowCount)} />
          <Metric label="Scores" value={String(stats.count)} />
          <Metric label="Avg Investment" value={stats.count > 0 ? String(stats.averageInvestmentScore) : "-"} />
          <Metric label="Flagged" value={stats.count > 0 ? String(stats.flaggedCount) : "-"} />
          <Metric label="Kept" value={String(datasetWatchlistCount)} />
          <Metric label="Tracked" value={String(datasetPortfolioCount)} />
        </div>
      </div>

      {state.scores.length === 0 ? (
        <div className="border border-line bg-white p-5">
          <h3 className="text-lg font-semibold">No scored records yet</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
            Run scoring to derive review records from this dataset's stored source rows.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <ScoreTable
            scores={visibleScores}
            totalCount={state.scores.length}
            selectedScoreId={selectedScore?.id ?? null}
            filter={filter}
            query={query}
            onFilterChange={setFilter}
            onQueryChange={setQuery}
            onSelect={(scoreId) => setState((current) => ({ ...current, selectedScoreId: scoreId }))}
            watchlistByScoreId={watchlistByScoreId}
            watchlistActionId={watchlistActionId}
            onAddToWatchlist={onAddToWatchlist}
            onRemoveFromWatchlist={onRemoveFromWatchlist}
            portfolioByScoreId={portfolioByScoreId}
            portfolioActionId={portfolioActionId}
            onAddToPortfolio={onAddScoreToPortfolio}
            onRemoveFromPortfolio={onRemoveFromPortfolio}
          />
          <ScoreDetail
            score={selectedScore}
            watchlistItem={selectedScore ? watchlistByScoreId.get(selectedScore.id) ?? null : null}
            watchlistActionId={watchlistActionId}
            onAddToWatchlist={onAddToWatchlist}
            onRemoveFromWatchlist={onRemoveFromWatchlist}
            portfolioItem={selectedScore ? portfolioByScoreId.get(selectedScore.id) ?? null : null}
            portfolioActionId={portfolioActionId}
            onAddToPortfolio={onAddScoreToPortfolio}
            onRemoveFromPortfolio={onRemoveFromPortfolio}
          />
        </div>
      )}
    </section>
  );
}

function WatchlistPage({
  items,
  isLoading,
  error,
  actionId,
  portfolioItems,
  portfolioActionId,
  portfolioError,
  onRetry,
  onRemove,
  onTrack,
}: {
  items: WatchlistItemResponse[];
  isLoading: boolean;
  error: string | null;
  actionId: string | null;
  portfolioItems: PortfolioItemResponse[];
  portfolioActionId: string | null;
  portfolioError: string | null;
  onRetry: () => void;
  onRemove: (watchlistItemId: string) => void;
  onTrack: (watchlistItemId: string) => void;
}) {
  const sortedItems = useMemo(() => sortWatchlistItemsForReview(items), [items]);
  const portfolioByScoreId = useMemo(() => buildPortfolioByScoreId(portfolioItems), [portfolioItems]);
  const portfolioByWatchlistId = useMemo(() => buildPortfolioByWatchlistId(portfolioItems), [portfolioItems]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const selectedItem = sortedItems.find((item) => item.id === selectedItemId) ?? sortedItems[0] ?? null;
  const selectedPortfolioItem = selectedItem
    ? portfolioByWatchlistId.get(selectedItem.id) ?? portfolioByScoreId.get(selectedItem.scoredRecordId) ?? null
    : null;

  useEffect(() => {
    if (selectedItemId && sortedItems.some((item) => item.id === selectedItemId)) {
      return;
    }

    setSelectedItemId(sortedItems[0]?.id ?? null);
  }, [selectedItemId, sortedItems]);

  if (isLoading && sortedItems.length === 0) {
    return <PanelMessage label="Loading watchlist..." />;
  }

  return (
    <section className="min-w-0 space-y-5">
      <div className="border border-line bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">Decision Layer</p>
            <h2 className="mt-1 text-2xl font-semibold">Watchlist</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/70">
              Compare scored records kept from dataset review without re-scanning every source row.
            </p>
          </div>
          <Metric label="Kept Records" value={String(sortedItems.length)} />
        </div>
        {error ? <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}
        {portfolioError ? (
          <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{portfolioError}</div>
        ) : null}
      </div>

      {sortedItems.length === 0 && !isLoading ? (
        <div className="border border-line bg-white p-5">
          <h3 className="text-lg font-semibold">No records kept yet</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
            Keep records from a scored dataset to build a shortlist for later comparison.
          </p>
          {error ? <PanelError message={error} onRetry={onRetry} /> : null}
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 border border-line bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink/70">
                Shortlist Comparison ({sortedItems.length})
              </h3>
              <button type="button" onClick={onRetry} className="border border-line px-3 py-2 text-sm font-semibold">
                Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[1080px] w-full border-collapse text-sm">
                <thead className="bg-field text-left text-xs uppercase tracking-[0.08em] text-ink/60">
                  <tr>
                    <th className="border-b border-line px-3 py-2">Record</th>
                    <th className="border-b border-line px-3 py-2">Portfolio</th>
                    <th className="border-b border-line px-3 py-2">Invest</th>
                    <th className="border-b border-line px-3 py-2">Risk</th>
                    <th className="border-b border-line px-3 py-2">Confidence</th>
                    <th className="border-b border-line px-3 py-2">Liquidity</th>
                    <th className="border-b border-line px-3 py-2">Redemption</th>
                    <th className="border-b border-line px-3 py-2">Coverage</th>
                    <th className="border-b border-line px-3 py-2">Flags</th>
                    <th className="border-b border-line px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => {
                    const band = scoreBand(item.investmentScore);
                    const portfolioItem =
                      portfolioByWatchlistId.get(item.id) ?? portfolioByScoreId.get(item.scoredRecordId) ?? null;
                    const isPortfolioActionPending =
                      portfolioActionId === item.id || (portfolioItem ? portfolioActionId === portfolioItem.id : false);
                    return (
                      <tr
                        key={item.id}
                        tabIndex={0}
                        onClick={() => setSelectedItemId(item.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedItemId(item.id);
                          }
                        }}
                        className={`cursor-pointer align-top hover:bg-field ${
                          selectedItem?.id === item.id ? "bg-field" : "bg-white"
                        }`}
                      >
                        <td className="border-b border-line px-3 py-3">
                          <div className="font-semibold">{primaryRecordLabel(item)}</div>
                          <div className="mt-1 text-xs text-ink/60">Dataset {shortId(item.datasetId)}</div>
                        </td>
                        <td className="border-b border-line px-3 py-3">
                          {portfolioItem ? (
                            <span
                              className={`inline-flex border px-2 py-1 text-xs font-semibold ${portfolioStatusClassName(
                                portfolioItem.status,
                              )}`}
                            >
                              {portfolioStatusLabel(portfolioItem.status)}
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={isPortfolioActionPending}
                              onClick={(event) => {
                                event.stopPropagation();
                                onTrack(item.id);
                              }}
                              className="border border-line bg-white px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isPortfolioActionPending ? "Tracking" : "Track"}
                            </button>
                          )}
                        </td>
                        <td className="border-b border-line px-3 py-3">
                          <span className={`inline-flex border px-2 py-1 text-xs font-semibold ${band.className}`}>
                            {item.investmentScore} {band.label}
                          </span>
                        </td>
                        <td className="border-b border-line px-3 py-3">{item.riskScore}</td>
                        <td className="border-b border-line px-3 py-3">{item.confidenceScore}</td>
                        <td className="border-b border-line px-3 py-3">{item.liquidityScore}</td>
                        <td className="border-b border-line px-3 py-3">{formatPercent(item.redemptionProbability)}</td>
                        <td className="border-b border-line px-3 py-3">{formatRatio(item.valueCoverageRatio)}</td>
                        <td className="max-w-[220px] border-b border-line px-3 py-3 text-xs text-ink/75">
                          {flagPreview(item)}
                        </td>
                        <td className="border-b border-line px-3 py-3">
                          <button
                            type="button"
                            disabled={actionId === item.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              onRemove(item.id);
                            }}
                            className="border border-line bg-white px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionId === item.id ? "Removing" : "Remove"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <WatchlistDetail
            item={selectedItem}
            actionId={actionId}
            portfolioItem={selectedPortfolioItem}
            portfolioActionId={portfolioActionId}
            onRemove={onRemove}
            onTrack={onTrack}
          />
        </div>
      )}
    </section>
  );
}

function PortfolioPage({
  items,
  isLoading,
  error,
  actionId,
  onRetry,
  onStatusChange,
  onRemove,
}: {
  items: PortfolioItemResponse[];
  isLoading: boolean;
  error: string | null;
  actionId: string | null;
  onRetry: () => void;
  onStatusChange: (portfolioItemId: string, status: PortfolioStatus) => void;
  onRemove: (portfolioItemId: string) => void;
}) {
  const sortedItems = useMemo(() => sortPortfolioItemsForReview(items), [items]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const selectedItem = sortedItems.find((item) => item.id === selectedItemId) ?? sortedItems[0] ?? null;
  const readyCount = sortedItems.filter((item) => item.status === "ready").length;
  const activeCount = sortedItems.filter((item) => item.status !== "closed" && item.status !== "discarded").length;
  const acquiredCount = sortedItems.filter((item) => item.status === "acquired").length;

  useEffect(() => {
    if (selectedItemId && sortedItems.some((item) => item.id === selectedItemId)) {
      return;
    }

    setSelectedItemId(sortedItems[0]?.id ?? null);
  }, [selectedItemId, sortedItems]);

  if (isLoading && sortedItems.length === 0) {
    return <PanelMessage label="Loading portfolio..." />;
  }

  return (
    <section className="min-w-0 space-y-5">
      <div className="border border-line bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">Operating Layer</p>
            <h2 className="mt-1 text-2xl font-semibold">Portfolio Tracking</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/70">
              Track records promoted from scoring or the watchlist with practical status, original reasoning, and risk context.
            </p>
          </div>
          <button type="button" onClick={onRetry} className="border border-line px-3 py-2 text-sm font-semibold">
            Refresh
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Metric label="Tracked Items" value={String(sortedItems.length)} />
          <Metric label="Active" value={String(activeCount)} />
          <Metric label="Ready" value={String(readyCount)} />
          <Metric label="Acquired" value={String(acquiredCount)} />
        </div>
        {error ? <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}
      </div>

      {sortedItems.length === 0 && !isLoading ? (
        <div className="border border-line bg-white p-5">
          <h3 className="text-lg font-semibold">No tracked portfolio items yet</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
            Track scored records from dataset review or promote watchlist items when they move from shortlist to active decision.
          </p>
          {error ? <PanelError message={error} onRetry={onRetry} /> : null}
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 border border-line bg-white">
            <div className="border-b border-line px-4 py-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink/70">
                Tracked Decisions ({sortedItems.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[1080px] w-full border-collapse text-sm">
                <thead className="bg-field text-left text-xs uppercase tracking-[0.08em] text-ink/60">
                  <tr>
                    <th className="border-b border-line px-3 py-2">Record</th>
                    <th className="border-b border-line px-3 py-2">Status</th>
                    <th className="border-b border-line px-3 py-2">Invest</th>
                    <th className="border-b border-line px-3 py-2">Risk</th>
                    <th className="border-b border-line px-3 py-2">Confidence</th>
                    <th className="border-b border-line px-3 py-2">Liquidity</th>
                    <th className="border-b border-line px-3 py-2">Coverage</th>
                    <th className="border-b border-line px-3 py-2">Flags</th>
                    <th className="border-b border-line px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => {
                    const band = scoreBand(item.investmentScore);
                    return (
                      <tr
                        key={item.id}
                        tabIndex={0}
                        onClick={() => setSelectedItemId(item.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedItemId(item.id);
                          }
                        }}
                        className={`cursor-pointer align-top hover:bg-field ${
                          selectedItem?.id === item.id ? "bg-field" : "bg-white"
                        }`}
                      >
                        <td className="border-b border-line px-3 py-3">
                          <div className="font-semibold">{primaryRecordLabel(item)}</div>
                          <div className="mt-1 text-xs text-ink/60">Dataset {shortId(item.datasetId)}</div>
                          {item.sourceWatchlistItemId ? (
                            <div className="mt-1 text-xs text-ink/60">Promoted from watchlist</div>
                          ) : (
                            <div className="mt-1 text-xs text-ink/60">Tracked from score review</div>
                          )}
                        </td>
                        <td className="border-b border-line px-3 py-3">
                          <span className={`inline-flex border px-2 py-1 text-xs font-semibold ${portfolioStatusClassName(item.status)}`}>
                            {portfolioStatusLabel(item.status)}
                          </span>
                        </td>
                        <td className="border-b border-line px-3 py-3">
                          <span className={`inline-flex border px-2 py-1 text-xs font-semibold ${band.className}`}>
                            {item.investmentScore} {band.label}
                          </span>
                        </td>
                        <td className="border-b border-line px-3 py-3">{item.riskScore}</td>
                        <td className="border-b border-line px-3 py-3">{item.confidenceScore}</td>
                        <td className="border-b border-line px-3 py-3">{item.liquidityScore}</td>
                        <td className="border-b border-line px-3 py-3">{formatRatio(item.valueCoverageRatio)}</td>
                        <td className="max-w-[220px] border-b border-line px-3 py-3 text-xs text-ink/75">
                          {flagPreview(item)}
                        </td>
                        <td className="border-b border-line px-3 py-3">
                          <button
                            type="button"
                            disabled={actionId === item.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              onRemove(item.id);
                            }}
                            className="border border-line bg-white px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionId === item.id ? "Removing" : "Remove"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <PortfolioDetail
            item={selectedItem}
            actionId={actionId}
            onStatusChange={onStatusChange}
            onRemove={onRemove}
          />
        </div>
      )}
    </section>
  );
}

function PortfolioDetail({
  item,
  actionId,
  onStatusChange,
  onRemove,
}: {
  item: PortfolioItemResponse | null;
  actionId: string | null;
  onStatusChange: (portfolioItemId: string, status: PortfolioStatus) => void;
  onRemove: (portfolioItemId: string) => void;
}) {
  if (!item) {
    return (
      <aside className="border border-line bg-white p-4">
        <p className="text-sm text-ink/70">No portfolio item selected.</p>
      </aside>
    );
  }

  return (
    <aside className="border border-line bg-white p-4 xl:sticky xl:top-4 xl:self-start">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pine">Portfolio Detail</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-xl font-semibold">{primaryRecordLabel(item)}</h3>
        <button
          type="button"
          disabled={actionId === item.id}
          onClick={() => onRemove(item.id)}
          className="shrink-0 border border-line px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionId === item.id ? "Removing" : "Remove"}
        </button>
      </div>
      <label className="mt-4 block text-sm font-semibold" htmlFor="portfolio-status">
        Status
      </label>
      <select
        id="portfolio-status"
        value={item.status}
        disabled={actionId === item.id}
        onChange={(event) => onStatusChange(item.id, event.target.value as PortfolioStatus)}
        className="mt-2 w-full border border-line bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {portfolioStatusOptions.map((status) => (
          <option key={status} value={status}>
            {portfolioStatusLabel(status)}
          </option>
        ))}
      </select>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <DetailTerm label="Lien" value={formatMoney(item.normalizedFields.lienAmount)} />
        <DetailTerm label="Value" value={formatMoney(item.normalizedFields.estimatedValue)} />
        <DetailTerm label="Coverage" value={formatRatio(item.valueCoverageRatio)} />
        <DetailTerm label="Dataset" value={shortId(item.datasetId)} />
        <DetailTerm label="Tracked" value={formatDateTime(item.trackedAt)} />
        <DetailTerm label="Status Updated" value={formatDateTime(item.statusUpdatedAt)} />
      </dl>
      <section className="mt-5">
        <h4 className="text-sm font-semibold">Original Reasoning</h4>
        <ol className="mt-2 space-y-2">
          {item.reasoning.map((reason) => (
            <li key={reason} className="border border-line bg-field px-3 py-2 text-sm leading-6 text-ink/80">
              {reason}
            </li>
          ))}
        </ol>
      </section>
      <section className="mt-5">
        <h4 className="text-sm font-semibold">Flags</h4>
        {item.flags.length === 0 ? (
          <p className="mt-2 text-sm text-ink/65">No flags returned.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {item.flags.map((flag) => (
              <li key={flag} className="border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {flag}
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}

function ScoreTable({
  scores,
  totalCount,
  selectedScoreId,
  filter,
  query,
  onFilterChange,
  onQueryChange,
  onSelect,
  watchlistByScoreId,
  watchlistActionId,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  portfolioByScoreId,
  portfolioActionId,
  onAddToPortfolio,
  onRemoveFromPortfolio,
}: {
  scores: ScoredRecordResponse[];
  totalCount: number;
  selectedScoreId: string | null;
  filter: ScoreFilter;
  query: string;
  onFilterChange: (filter: ScoreFilter) => void;
  onQueryChange: (query: string) => void;
  onSelect: (scoreId: string) => void;
  watchlistByScoreId: Map<string, WatchlistItemResponse>;
  watchlistActionId: string | null;
  onAddToWatchlist: (scoredRecordId: string) => void;
  onRemoveFromWatchlist: (watchlistItemId: string) => void;
  portfolioByScoreId: Map<string, PortfolioItemResponse>;
  portfolioActionId: string | null;
  onAddToPortfolio: (scoredRecordId: string) => void;
  onRemoveFromPortfolio: (portfolioItemId: string) => void;
}) {
  return (
    <div className="min-w-0 border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink/70">
          Scored Records {scores.length !== totalCount ? `(${scores.length}/${totalCount})` : `(${totalCount})`}
        </h3>
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Filter records"
            className="w-44 border border-line px-3 py-2 text-sm"
          />
          <select
            value={filter}
            onChange={(event) => onFilterChange(event.target.value as ScoreFilter)}
            className="border border-line bg-white px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="flagged">Flagged</option>
            <option value="strong">Strong</option>
            <option value="weak">Weak</option>
          </select>
        </div>
      </div>
      {scores.length === 0 ? (
        <PanelMessage label="No records match the current filter." />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[1140px] w-full border-collapse text-sm">
            <thead className="bg-field text-left text-xs uppercase tracking-[0.08em] text-ink/60">
              <tr>
                <th className="border-b border-line px-3 py-2">Record</th>
                <th className="border-b border-line px-3 py-2">Keep</th>
                <th className="border-b border-line px-3 py-2">Track</th>
                <th className="border-b border-line px-3 py-2">Invest</th>
                <th className="border-b border-line px-3 py-2">Risk</th>
                <th className="border-b border-line px-3 py-2">Confidence</th>
                <th className="border-b border-line px-3 py-2">Liquidity</th>
                <th className="border-b border-line px-3 py-2">Redemption</th>
                <th className="border-b border-line px-3 py-2">Coverage</th>
                <th className="border-b border-line px-3 py-2">Flags</th>
                <th className="border-b border-line px-3 py-2">Reasoning</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score) => {
                const band = scoreBand(score.investmentScore);
                const watchlistItem = watchlistByScoreId.get(score.id) ?? null;
                const portfolioItem = portfolioByScoreId.get(score.id) ?? null;
                const isWatchlistActionPending =
                  watchlistActionId === score.id || (watchlistItem ? watchlistActionId === watchlistItem.id : false);
                const isPortfolioActionPending =
                  portfolioActionId === score.id || (portfolioItem ? portfolioActionId === portfolioItem.id : false);
                return (
                  <tr
                    key={score.id}
                    tabIndex={0}
                    onClick={() => onSelect(score.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect(score.id);
                      }
                    }}
                    className={`cursor-pointer align-top hover:bg-field ${
                      selectedScoreId === score.id ? "bg-field" : "bg-white"
                    }`}
                  >
                    <td className="border-b border-line px-3 py-3">
                      <div className="font-semibold">{primaryRecordLabel(score)}</div>
                      <div className="mt-1 text-xs text-ink/60">Source row {score.sourceRowNumber}</div>
                      {score.normalizedFields.address ? (
                        <div className="mt-1 max-w-[180px] truncate text-xs text-ink/60">
                          {score.normalizedFields.address}
                        </div>
                      ) : null}
                    </td>
                    <td className="border-b border-line px-3 py-3">
                      <button
                        type="button"
                        disabled={isWatchlistActionPending}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (watchlistItem) {
                            onRemoveFromWatchlist(watchlistItem.id);
                          } else {
                            onAddToWatchlist(score.id);
                          }
                        }}
                        className={`border px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                          watchlistItem
                            ? "border-pine bg-pine text-white"
                            : "border-line bg-white text-ink"
                        }`}
                      >
                        {isWatchlistActionPending ? "Working" : watchlistItem ? "Kept" : "Keep"}
                      </button>
                    </td>
                    <td className="border-b border-line px-3 py-3">
                      <button
                        type="button"
                        disabled={isPortfolioActionPending}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (portfolioItem) {
                            onRemoveFromPortfolio(portfolioItem.id);
                          } else {
                            onAddToPortfolio(score.id);
                          }
                        }}
                        className={`border px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                          portfolioItem
                            ? `${portfolioStatusClassName(portfolioItem.status)}`
                            : "border-line bg-white text-ink"
                        }`}
                      >
                        {isPortfolioActionPending ? "Working" : portfolioItem ? "Tracked" : "Track"}
                      </button>
                    </td>
                    <td className="border-b border-line px-3 py-3">
                      <span className={`inline-flex border px-2 py-1 text-xs font-semibold ${band.className}`}>
                        {score.investmentScore} {band.label}
                      </span>
                    </td>
                    <td className="border-b border-line px-3 py-3">{score.riskScore}</td>
                    <td className="border-b border-line px-3 py-3">{score.confidenceScore}</td>
                    <td className="border-b border-line px-3 py-3">{score.liquidityScore}</td>
                    <td className="border-b border-line px-3 py-3">{formatPercent(score.redemptionProbability)}</td>
                    <td className="border-b border-line px-3 py-3">{formatRatio(score.valueCoverageRatio)}</td>
                    <td className="max-w-[180px] border-b border-line px-3 py-3 text-xs text-ink/75">
                      {flagPreview(score)}
                    </td>
                    <td className="max-w-[240px] border-b border-line px-3 py-3 text-xs leading-5 text-ink/75">
                      {reasoningPreview(score)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ScoreDetail({
  score,
  watchlistItem,
  watchlistActionId,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  portfolioItem,
  portfolioActionId,
  onAddToPortfolio,
  onRemoveFromPortfolio,
}: {
  score: ScoredRecordResponse | null;
  watchlistItem: WatchlistItemResponse | null;
  watchlistActionId: string | null;
  onAddToWatchlist: (scoredRecordId: string) => void;
  onRemoveFromWatchlist: (watchlistItemId: string) => void;
  portfolioItem: PortfolioItemResponse | null;
  portfolioActionId: string | null;
  onAddToPortfolio: (scoredRecordId: string) => void;
  onRemoveFromPortfolio: (portfolioItemId: string) => void;
}) {
  if (!score) {
    return (
      <aside className="border border-line bg-white p-4">
        <p className="text-sm text-ink/70">No record selected.</p>
      </aside>
    );
  }

  return (
    <aside className="border border-line bg-white p-4 xl:sticky xl:top-4 xl:self-start">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pine">Record Detail</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-xl font-semibold">{primaryRecordLabel(score)}</h3>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={watchlistActionId === score.id || (watchlistItem ? watchlistActionId === watchlistItem.id : false)}
            onClick={() => {
              if (watchlistItem) {
                onRemoveFromWatchlist(watchlistItem.id);
              } else {
                onAddToWatchlist(score.id);
              }
            }}
            className={`border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
              watchlistItem ? "border-pine bg-pine text-white" : "border-line bg-white text-ink"
            }`}
          >
            {watchlistItem ? "Remove" : "Keep"}
          </button>
          <button
            type="button"
            disabled={portfolioActionId === score.id || (portfolioItem ? portfolioActionId === portfolioItem.id : false)}
            onClick={() => {
              if (portfolioItem) {
                onRemoveFromPortfolio(portfolioItem.id);
              } else {
                onAddToPortfolio(score.id);
              }
            }}
            className={`border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
              portfolioItem ? portfolioStatusClassName(portfolioItem.status) : "border-line bg-white text-ink"
            }`}
          >
            {portfolioItem ? portfolioStatusLabel(portfolioItem.status) : "Track"}
          </button>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <DetailTerm label="Lien" value={formatMoney(score.normalizedFields.lienAmount)} />
        <DetailTerm label="Value" value={formatMoney(score.normalizedFields.estimatedValue)} />
        <DetailTerm label="Coverage" value={formatRatio(score.valueCoverageRatio)} />
        <DetailTerm label="Type" value={score.normalizedFields.propertyTypeCategory} />
      </dl>
      <section className="mt-5">
        <h4 className="text-sm font-semibold">Flags</h4>
        {score.flags.length === 0 ? (
          <p className="mt-2 text-sm text-ink/65">No flags returned.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {score.flags.map((flag) => (
              <li key={flag} className="border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {flag}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-5">
        <h4 className="text-sm font-semibold">Reasoning</h4>
        <ol className="mt-2 space-y-2">
          {score.reasoning.map((reason) => (
            <li key={reason} className="border border-line bg-field px-3 py-2 text-sm leading-6 text-ink/80">
              {reason}
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}

function WatchlistDetail({
  item,
  actionId,
  portfolioItem,
  portfolioActionId,
  onRemove,
  onTrack,
}: {
  item: WatchlistItemResponse | null;
  actionId: string | null;
  portfolioItem: PortfolioItemResponse | null;
  portfolioActionId: string | null;
  onRemove: (watchlistItemId: string) => void;
  onTrack: (watchlistItemId: string) => void;
}) {
  if (!item) {
    return (
      <aside className="border border-line bg-white p-4">
        <p className="text-sm text-ink/70">No watchlist item selected.</p>
      </aside>
    );
  }

  return (
    <aside className="border border-line bg-white p-4 xl:sticky xl:top-4 xl:self-start">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pine">Watchlist Detail</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-xl font-semibold">{primaryRecordLabel(item)}</h3>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {portfolioItem ? (
            <span
              className={`inline-flex border px-3 py-2 text-xs font-semibold ${portfolioStatusClassName(
                portfolioItem.status,
              )}`}
            >
              {portfolioStatusLabel(portfolioItem.status)}
            </span>
          ) : (
            <button
              type="button"
              disabled={portfolioActionId === item.id}
              onClick={() => onTrack(item.id)}
              className="border border-line px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {portfolioActionId === item.id ? "Tracking" : "Track"}
            </button>
          )}
          <button
            type="button"
            disabled={actionId === item.id}
            onClick={() => onRemove(item.id)}
            className="border border-line px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionId === item.id ? "Removing" : "Remove"}
          </button>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <DetailTerm label="Lien" value={formatMoney(item.normalizedFields.lienAmount)} />
        <DetailTerm label="Value" value={formatMoney(item.normalizedFields.estimatedValue)} />
        <DetailTerm label="Coverage" value={formatRatio(item.valueCoverageRatio)} />
        <DetailTerm label="Dataset" value={shortId(item.datasetId)} />
      </dl>
      <section className="mt-5">
        <h4 className="text-sm font-semibold">Why it is kept</h4>
        <ol className="mt-2 space-y-2">
          {item.reasoning.map((reason) => (
            <li key={reason} className="border border-line bg-field px-3 py-2 text-sm leading-6 text-ink/80">
              {reason}
            </li>
          ))}
        </ol>
      </section>
      <section className="mt-5">
        <h4 className="text-sm font-semibold">Flags</h4>
        {item.flags.length === 0 ? (
          <p className="mt-2 text-sm text-ink/65">No flags returned.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {item.flags.map((flag) => (
              <li key={flag} className="border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {flag}
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink/55">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function DetailTerm({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/55">{label}</p>
      <p className="mt-1 break-words font-medium">{value}</p>
    </div>
  );
}

function PanelMessage({ label }: { label: string }) {
  return <div className="border border-line bg-white p-5 text-sm text-ink/70">{label}</div>;
}

function PanelError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="border border-red-200 bg-red-50 p-5 text-sm text-red-800">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="mt-3 border border-red-300 px-3 py-2 font-semibold">
          Retry
        </button>
      ) : null}
    </div>
  );
}

function navigate(page: PageState, setPage: (page: PageState) => void): void {
  const hash =
    page.name === "datasets"
      ? "#/datasets"
      : page.name === "watchlist"
        ? "#/watchlist"
        : page.name === "portfolio"
          ? "#/portfolio"
          : `#/datasets/${page.datasetId}`;
  window.history.pushState(null, "", hash);
  setPage(page);
}

function readRoute(): PageState {
  if (window.location.hash === "#/watchlist") {
    return { name: "watchlist" };
  }

  if (window.location.hash === "#/portfolio") {
    return { name: "portfolio" };
  }

  const match = window.location.hash.match(/^#\/datasets\/([^/]+)$/);
  if (match?.[1]) {
    return { name: "dataset", datasetId: decodeURIComponent(match[1]) };
  }

  return { name: "datasets" };
}

function loadStoredSession(): StoredSession | null {
  const raw = sessionStorage.getItem(authStorageKey);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (typeof parsed.token === "string" && parsed.user && typeof parsed.user.id === "string") {
      return parsed as StoredSession;
    }
  } catch {
    sessionStorage.removeItem(authStorageKey);
  }

  sessionStorage.removeItem(authStorageKey);
  return null;
}

async function refreshSession(
  token: string,
  setSession: (session: StoredSession | null) => void,
): Promise<void> {
  try {
    const result = await getCurrentUser(token);
    const nextSession = { token, user: result.user };
    sessionStorage.setItem(authStorageKey, JSON.stringify(nextSession));
    setSession(nextSession);
  } catch (error: unknown) {
    if (isAuthError(error)) {
      clearSession(setSession);
    }
  }
}

function clearSession(setSession: (session: StoredSession | null) => void): void {
  sessionStorage.removeItem(authStorageKey);
  setSession(null);
}

function isAuthError(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 401;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(-8) : id;
}

function upsertPortfolioItem(current: PortfolioState, item: PortfolioItemResponse): PortfolioState {
  const withoutDuplicate = current.items.filter(
    (existing) => existing.id !== item.id && existing.scoredRecordId !== item.scoredRecordId,
  );

  return {
    ...current,
    items: sortPortfolioItemsForReview([item, ...withoutDuplicate]),
    actionId: null,
    error: null,
  };
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default App;
