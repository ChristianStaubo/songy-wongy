# Feature-Based API Call & State Management Workflow

This document outlines the standard workflow for handling forms, state, and API calls within a feature in the TripSplitGPT client, complementing the overall structure defined in `feature_based.md`.

Our stack for this pattern includes:

- **Forms:** `react-hook-form`
- **Validation:** `zod`
- **Complex/Persistent State:** `zustand`
- **API Calls & Async State:** `@tanstack/react-query` (`useQuery`, `useMutation`)
- **Authentication:** Firebase Auth
- **Notifications:** `react-toastify`

---

## Workflow Steps

1.  **Define Validation Schemas (`schemas/`)**
    - Create Zod schemas for form validation (e.g., `completeProfileSchema.ts`).
    - Export both the schema and the inferred TypeScript type (`z.infer<typeof schema>`).

2.  **Manage Form State (`components/` or Pages)**
    - Use `react-hook-form` (`useForm`) within your form components or pages.
    - Integrate the Zod schema using `zodResolver` for validation.

3.  **Handle Complex/Multi-Step State (`store/`)**
    - _If_ a feature involves multiple steps or components sharing complex state, use `zustand`.
    - Create a store (e.g., `useUserStore.ts`) to hold the data pieces.
    - Define actions (`setUserProfile`, `reset`, etc.) to update the store.
    - Components can subscribe to this store to get/set shared data.
    - **Note:** Do _not_ include API call logic (fetching, loading states, error states) directly in the Zustand store. That's React Query's job.

4.  **Define API Call Logic (`api/`)**
    - Create a dedicated file for _each_ backend API endpoint interaction (e.g., `create-user.ts`, `get-user-profile.ts`).
    - Define the request payload interface/type (DTO) and the expected success data type (what's inside `ApiResponse.data`) _inline_ within this file.
    - Export an async function that takes the required payload and authentication token (if needed).
    - This function uses a base fetch helper (e.g., `post`, `get` from `@/lib/utils/fetch`) which likely returns an `ApiResponse<T>` object (`{ data: T | null, error: string | null }`).
    - The API function should handle the token by accepting it as an argument and passing it in the `FetchConfig`.

    ```typescript
    // Example: api/create-user.ts
    import { FetchConfig, post } from "../../../lib/utils/fetch";
    import { UserProfile } from "../types/user-types";

    export interface CreateUserDto {
      /* ... fields ... */
    }

    // Note: This is the type expected *within* the `data` property of ApiResponse
    // If the API returns the UserProfile directly in `data`, use that type.
    type CreateUserSuccessData = UserProfile;

    export const createUser = async (data: CreateUserDto, token: string) => {
      const endpoint = "/users-v2/create";
      const config: FetchConfig = { token };

      // post returns ApiResponse<UserProfile>
      const response = await post<UserProfile, CreateUserDto>(
        endpoint,
        data,
        config
      );

      if (response.error) {
        console.error("API Error creating user:", response.error);
        throw new Error(response.error || "Unknown API error creating user");
      }
      // Return the whole response; the hook extracts data
      return response;
    };
    ```

5.  **Wrap API Call with React Query (`hooks/`)**
    - Create a custom hook using `@tanstack/react-query`'s `useMutation` (for POST/PUT/DELETE) or `useQuery` (for GET).
    - This hook wraps the API function created in the previous step.
    - The `mutationFn` (for `useMutation`) or `queryFn` (for `useQuery`) handles fetching the auth token (using `useFirebase` and `currentUser.getIdToken()`) and calling the API function with the token.
    - It should extract the actual data (e.g., `response.data`) from the `ApiResponse` returned by the API function before returning it from `mutationFn`/`queryFn`.
    - Implement `onSuccess` and `onError` within the hook options to provide generic feedback (e.g., toast notifications using `react-toastify`).
    - The hook manages the async state (`isPending`, `isError`, `error`, `data`).

    ```typescript
    // Example: hooks/use-create-user.ts
    import { useMutation } from "@tanstack/react-query";
    // Default import
    import { toast } from "react-toastify";

    import useFirebase from "@/lib/firebase";

    // Use react-toastify
    import { CreateUserDto, createUser } from "../api/create-user";
    import { useUserStore } from "../store/useUserStore";
    import { UserProfile } from "../types/user-types";

    // Example store

    type ApiError = { message: string }; // Or use ApiError from fetch utils

    export const useCreateUser = () => {
      const { setUserProfile } = useUserStore(); // Example: Update zustand store
      const { auth } = useFirebase();

      // Expect UserProfile directly as success data
      return useMutation<UserProfile, ApiError, CreateUserDto>({
        mutationFn: async (userData: CreateUserDto) => {
          const currentUser = auth?.currentUser;
          if (!currentUser) throw new Error("User not authenticated.");

          let token: string;
          try {
            token = await currentUser.getIdToken();
          } catch (error) {
            throw new Error("Could not verify authentication.");
          }

          // createUser returns ApiResponse<UserProfile>
          const response = await createUser(userData, token);

          if (!response.data) {
            throw new Error(response.error || "No data returned.");
          }
          // Return only the inner data for the hook's result
          return response.data;
        },
        onError: (error) => {
          console.error("User creation failed:", error);
          toast.error(error.message || "Failed to create profile.");
        },
        onSuccess: (data: UserProfile) => {
          // data is UserProfile here
          console.log("Hook onSuccess: User creation successful", data);
          // Example: Update global state
          setUserProfile(data);
          // Optional: Generic success toast (often overridden in component)
          // toast.success("Profile created!");
        },
      });
    };
    ```

6.  **Connect in UI Component (Pages or `components/`)**
    - In the component that triggers the action (e.g., the form submission button):
      - Get necessary data from the Zustand store (if used).
      - Get form data from `react-hook-form`'s `handleSubmit`.
      - Call the React Query hook (`useMyMutation()`).
      - Extract `mutate` (or `refetch`) and state variables (`isPending`, `error`) from the hook.
      - In the `handleSubmit` callback:
        - Combine and format the data from the store and form into the required DTO.
        - Perform any final client-side validation.
        - Call the `mutate` function with the payload.
        - Pass component-specific `onSuccess` and `onError` callbacks _to the `mutate` function_.
          - `onSuccess`: Handle navigation, reset forms/stores, show specific success messages using `toast`.
          - `onError`: Handle component-specific error UI updates if needed (beyond the hook's generic toast).
      - Use the `isPending` state (e.g., `isCreatingUser`) to disable buttons, show spinners, etc.

    ```typescript
    // Example: pages/profile/complete.tsx (simplified)
    import { useCreateUser } from "@/features/user/hooks/use-create-user";
    import { useForm, SubmitHandler } from "react-hook-form";
    import { useRouter } from "next/router";
    import { toast } from "react-toastify";
    import { CompleteProfileFormData } from "@/features/user/schemas/complete-profile-schema";
    // Assume DTO is similar or identical to CompleteProfileFormData for this example

    function CompleteProfilePage() {
      // const { /* zustand data */ } = useUserStore();
      const { mutate: createUserMutate, isPending: isCreatingUser } = useCreateUser();
      const { handleSubmit, /*... other useForm returns */ } = useForm<CompleteProfileFormData>(/* ... config ... */);
      const router = useRouter();

      const onSubmit: SubmitHandler<CompleteProfileFormData> = (formData) => {
        // Combine store data + formData into payload (CreateUserDto) if needed
        const payload = { ...formData, /* include email if not in form */ };

        createUserMutate(payload, {
          onSuccess: (response) => { // response here is UserProfile
            toast.success("Profile details saved!");
            // resetStore(); // If using zustand
            // Invalidate queries if needed
            router.push("/profile/sign-up"); // Navigate to next step
          },
          onError: (error) => {
            // Hook already shows a generic error toast via its own onError
            console.error("Component onError callback:", error);
            // Add specific UI updates if needed
          },
        });
      };

      return (
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* ... form fields ... */}
          <Button type="submit" disabled={isCreatingUser}>
            {isCreatingUser ? "Saving..." : "Save and Continue"}
          </Button>
        </form>
      );
    }
    ```

---

By following this pattern, we ensure:

- **Separation of Concerns:** UI, state, validation, and API logic are clearly separated.
- **Reusability:** Hooks and API functions can be reused if needed (though typically scoped to the feature).
- **Testability:** Each part (store, hook, API function) can be tested more easily in isolation.
- **Consistency:** Provides a predictable structure for all features involving API calls.
