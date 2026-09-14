import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useAcceptFriendRequest,
  useFriendRequests,
  useFriends,
  usePrivacySettings,
  useRemoveFriendship,
  useSendFriendRequest,
  useUpdatePrivacySettings,
} from "../api/friends.js";
import type { PrivacySettings, Visibility } from "../types.js";

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: "ALL", label: "Show to all" },
  { value: "FRIENDS", label: "Show to only friends" },
  { value: "PRIVATE", label: "Completely private" },
];

function VisibilitySelect({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: Visibility;
  onChange: (v: Visibility) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-sm text-gray-700">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as Visibility)}
        className="border rounded px-2 py-1 text-sm disabled:opacity-50"
      >
        {VISIBILITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FriendsPage() {
  const { data: friends } = useFriends();
  const { data: requests } = useFriendRequests();
  const { data: privacy } = usePrivacySettings();

  const sendRequest = useSendFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const removeFriendship = useRemoveFriendship();
  const updatePrivacy = useUpdatePrivacySettings();

  const [email, setEmail] = useState("");
  const [requestMessage, setRequestMessage] = useState<string | null>(null);

  async function handleSendRequest(e: React.FormEvent) {
    e.preventDefault();
    setRequestMessage(null);
    const trimmed = email.trim();
    if (!trimmed) return;
    try {
      const result = await sendRequest.mutateAsync(trimmed);
      setRequestMessage(result.status === "accepted" ? `You and ${trimmed} are now friends!` : "Friend request sent.");
      setEmail("");
    } catch (err) {
      setRequestMessage(err instanceof Error ? err.message : "Failed to send request");
    }
  }

  function handleVisibilityChange(key: keyof PrivacySettings, value: Visibility) {
    updatePrivacy.mutate({ [key]: value });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-800">Friends</h1>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-gray-800">Add a friend</h2>
        <form onSubmit={handleSendRequest} className="flex gap-2 flex-wrap">
          <input
            type="email"
            placeholder="Add by email..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 min-w-[10rem] border rounded px-3 py-2 text-base sm:text-sm"
          />
          <button
            type="submit"
            disabled={sendRequest.isPending}
            className="bg-terracotta-600 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            Send request
          </button>
        </form>
        {requestMessage && <p className="text-sm text-gray-600">{requestMessage}</p>}
      </section>

      {requests && requests.incoming.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-gray-800">Friend requests</h2>
          <ul className="flex flex-col gap-1">
            {requests.incoming.map((r) => (
              <li key={r.id} className="flex items-center gap-2 bg-white border rounded px-3 py-2">
                <span className="flex-1 text-sm">{r.from.name ?? r.from.email}</span>
                <button
                  onClick={() => acceptRequest.mutate(r.id)}
                  className="text-sm text-terracotta-700 hover:underline px-2 py-1"
                >
                  Accept
                </button>
                <button
                  onClick={() => removeFriendship.mutate(r.id)}
                  className="text-sm text-gray-400 hover:text-red-500 px-2 py-1"
                >
                  Decline
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {requests && requests.outgoing.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-gray-800">Sent requests</h2>
          <ul className="flex flex-col gap-1">
            {requests.outgoing.map((r) => (
              <li key={r.id} className="flex items-center gap-2 bg-white border rounded px-3 py-2">
                <span className="flex-1 text-sm text-gray-600">{r.to.name ?? r.to.email}</span>
                <span className="text-xs text-gray-400">Pending</span>
                <button
                  onClick={() => removeFriendship.mutate(r.id)}
                  className="text-sm text-gray-400 hover:text-red-500 px-2 py-1"
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-gray-800">Your friends</h2>
        {friends?.length === 0 && <p className="text-sm text-gray-500">No friends yet — add one above.</p>}
        <ul className="flex flex-col gap-1">
          {friends?.map((f) => (
            <li key={f.friendshipId} className="flex items-center gap-2 bg-white border rounded px-3 py-2">
              {f.picture && <img src={f.picture} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />}
              <Link to={`/friends/${f.id}`} className="flex-1 text-sm text-terracotta-800 hover:underline">
                {f.name ?? f.email}
              </Link>
              <button
                onClick={() => removeFriendship.mutate(f.friendshipId)}
                className="text-sm text-gray-400 hover:text-red-500 px-2 py-1"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      {privacy && (
        <section className="flex flex-col gap-1">
          <h2 className="font-semibold text-gray-800 mb-1">Privacy settings</h2>
          <p className="text-xs text-gray-500 mb-2">Choose who can see each part of your activity.</p>
          <VisibilitySelect
            label="Meal plan"
            value={privacy.mealPlanVisibility}
            disabled={updatePrivacy.isPending}
            onChange={(v) => handleVisibilityChange("mealPlanVisibility", v)}
          />
          <VisibilitySelect
            label="Recently made recipes"
            value={privacy.recentlyMadeVisibility}
            disabled={updatePrivacy.isPending}
            onChange={(v) => handleVisibilityChange("recentlyMadeVisibility", v)}
          />
          <VisibilitySelect
            label="Full recipe list"
            value={privacy.recipeListVisibility}
            disabled={updatePrivacy.isPending}
            onChange={(v) => handleVisibilityChange("recipeListVisibility", v)}
          />
        </section>
      )}
    </div>
  );
}
