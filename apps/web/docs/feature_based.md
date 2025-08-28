# 🧠 Cursor Rules – Feature-Based Architecture

We use zustand for complex state management, and react-query for async fetching of data from our backend.

This project uses a **feature-first folder structure**, where each feature owns its:

- ✅ UI components
- ✅ Business logic
- ✅ State management (via Zustand or context)
- ✅ API integration logic
- ✅ Validation schemas
- ✅ Types/interfaces

The goal is to **encapsulate all logic related to a specific feature** inside a dedicated folder. This enables high cohesion and makes features easier to reason about, scale, and reuse.

---

## 📁 Folder Structure (Feature Example)

src/
└── features/
└── createTrip/
├── components/
│ ├── step-1-trip-basics.tsx
│ └── step-2-preferences.tsx
│
├── hooks/
│ └── use-trip-validation.ts
│
├── api/
│ ├── submit-trip.ts
│ └── fetch-trip-suggestions.ts
│
├── store/
│ └── use-create-trip-store.ts
│
├── types/
│ └── types.ts
│
├── schemas/
│ ├── step-1-schema.ts
│ └── step-2-schema.ts
│

> Note: Not every feature will include all of these folders. Add only what's necessary. Some features may include extra folders such as `schemas`, `interfaces`, or `constants` when needed.

---

## 📦 Folder Guidelines

### `components/`

Holds all UI pieces related to the feature. These components are **feature-scoped**, meaning they should not be reused outside unless they're explicitly made reusable.

### `hooks/`

Feature-specific custom hooks, often for syncing with form state, performing validation, triggering debounced logic, etc.

### `api/`

Functions that call our backend (REST) These wrap a custo `fetch()`.

### `store/`

Zustand or local state containers that persist state across multiple steps or screens within the feature.

### `types/`

TypeScript types/interfaces for the feature's forms, outputs, prompts, etc.

### `schemas/`

Zod schemas for validation and inference. May include multiple schemas for multi-step forms or complex input/output structures.

---

## ✅ Best Practices

- Keep validation scoped to each step using Zod.
- Store multi-step form state in Zustand for final submission.
- Avoid leaking feature logic into global app state.
- Use `api/submit-something.ts` as single-responsibility POST/GET handlers.

---

## 🧠 Tagging Your AI Agent

When creating a new feature:

- Create a folder inside `src/features/[feature-name]`
- Add only the folders needed (`components`, `store`, etc)
- Structure business logic and UI locally inside that feature folder
- Refer to this file for how to name and organize folders/files

---

## 📌 Example: Trip Creation Flow

- Step 1: `step-1-trip-basics.tsx` (uses `step1Schema.ts`)
- Step 2: `step-2-preferences.tsx` (uses `step2Schema.ts`)
- Final submission pulls data from `use-create-trip-store.ts` and uses `submit-trip.ts`

This ensures clean separation of concerns, scoped validation, and easily testable logic.

---

## 💻 UI Component Structure for Data Fetching

When a UI component needs to fetch data using a React Query hook (`useQuery`), it should consistently handle the different states of the data fetching lifecycle: Loading, Error, and Success. This ensures a robust and predictable user experience.

**Standard Pattern:**

1.  **Fetch Data:** Call the relevant `useQuery` hook (e.g., `useGetTripById(tripId)`) at the top of the component. Destructure the necessary state variables: `data`, `isLoading`, `isError`, and optionally `error`.

2.  **Handle Loading State:** Check the `isLoading` boolean. If `true`, return a loading indicator. Prefer using **skeleton loaders** (`@/components/ui/skeleton` or similar) that mimic the layout of the final UI to reduce layout shifts and perceived loading time.

3.  **Handle Error State:** Check the `isError` boolean. If `true`, return an appropriate error component or message. You can optionally use the `error` object returned by the hook for more specific error handling or logging.

4.  **Render Success State:** If neither `isLoading` nor `isError` is `true`, it's safe to assume the data fetching was successful and the `data` is available (though you might add an extra check for `data` existence if the API could potentially return successfully with no data). Render the main UI of the component, passing the fetched `data` to the necessary child components.

**Example (`src/app/trip/[id]/page.tsx` adaptation):**

```typescript
import { useParams } from "next/navigation";
import { useGetTripById } from "@/features/trip/hooks/use-get-trip-by-id";
import TripNotFound from "@/features/trip/components/TripNotFound";
import TripHeader from "@/features/trip/components/TripHeader";
import ItinerarySection from "@/features/trip/components/ItinerarySection";
import { Skeleton } from "@/components/ui/skeleton";

export default function TripDashboardPage() {
  const params = useParams();
  const tripId = params?.id as string;

  // 1. Fetch Data
  const { data: trip, isLoading, isError, error } = useGetTripById(tripId);

  // 2. Handle Loading State
  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Skeleton matching the final layout */}
        <Skeleton className="h-10 w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {" "}
            <Skeleton className="h-64 w-full" />{" "}
          </div>
          <div className="lg:col-span-1 space-y-6">
            {" "}
            <Skeleton className="h-48 w-full" />{" "}
          </div>
        </div>
      </div>
    );
  }

  // 3. Handle Error State
  if (isError || !trip) {
    // Also check !trip as a safeguard
    if (error) {
      console.error("Error fetching trip:", error);
    }
    return <TripNotFound />; // Render specific error component
  }

  // 4. Render Success State
  return (
    <div className="container mx-auto p-6 space-y-6">
      <TripHeader trip={trip} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6"> {/* Main content */} </div>
        <div className="lg:col-span-1 space-y-6">
          <ItinerarySection itinerary={trip.itinerary} />
        </div>
      </div>
    </div>
  );
}
```

This pattern provides a clear and repeatable structure for handling asynchronous data within UI components.

---
