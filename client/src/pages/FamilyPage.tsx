import { useState } from "react";
import { useCurrentUser } from "../api/auth.js";
import {
  useAcceptFamilyInvite,
  useCreateFamily,
  useFamily,
  useInviteToFamily,
  useMyFamilyInvites,
  useRemoveFamilyInvite,
  useRemoveFamilyMember,
} from "../api/family.js";

function MyInvitesSection() {
  const { data: invites } = useMyFamilyInvites();
  const acceptInvite = useAcceptFamilyInvite();
  const removeInvite = useRemoveFamilyInvite();
  const [error, setError] = useState<string | null>(null);

  if (!invites || invites.length === 0) return null;

  async function handleAccept(id: string) {
    setError(null);
    try {
      await acceptInvite.mutateAsync(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invite");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-semibold text-gray-800">Household invites</h2>
      <ul className="flex flex-col gap-1">
        {invites.map((invite) => (
          <li key={invite.id} className="flex items-center gap-2 bg-white border rounded px-3 py-2">
            <span className="flex-1 text-sm">
              Join <strong>{invite.familyName || "their household"}</strong>
            </span>
            <button
              onClick={() => handleAccept(invite.id)}
              className="text-sm text-terracotta-700 hover:underline px-2 py-1"
            >
              Accept
            </button>
            <button
              onClick={() => removeInvite.mutate(invite.id)}
              className="text-sm text-gray-400 hover:text-red-500 px-2 py-1"
            >
              Decline
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function FamilyPage() {
  const { data: user } = useCurrentUser();
  const { data: family, isLoading } = useFamily();
  const createFamily = useCreateFamily();
  const inviteToFamily = useInviteToFamily();
  const removeMember = useRemoveFamilyMember();
  const removeInvite = useRemoveFamilyInvite();

  const [familyName, setFamilyName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createFamily.mutateAsync(familyName.trim() || undefined);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteMessage(null);
    const email = inviteEmail.trim();
    if (!email) return;
    try {
      await inviteToFamily.mutateAsync(email);
      setInviteMessage(`Invite sent — ${email} needs to accept it to join.`);
      setInviteEmail("");
    } catch (err) {
      setInviteMessage(err instanceof Error ? err.message : "Failed to send invite");
    }
  }

  if (isLoading) return <p className="text-gray-500 px-4 py-6">Loading...</p>;

  if (!family) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Household</h1>
        <MyInvitesSection />
        <p className="text-sm text-gray-600">
          Create a household to share your recipes, meal plan, and shopping list with other people. Your existing
          recipes and plans will move into the household.
        </p>
        <form onSubmit={handleCreate} className="flex gap-2 flex-wrap">
          <input
            placeholder="Household name (optional)"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            className="flex-1 min-w-[10rem] border rounded px-3 py-2 text-base sm:text-sm"
          />
          <button
            type="submit"
            disabled={createFamily.isPending}
            className="bg-terracotta-600 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            Create household
          </button>
        </form>
      </div>
    );
  }

  const isOwner = user?.id === family.ownerId;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-gray-800">{family.name || "Your household"}</h1>

      <ul className="flex flex-col gap-1">
        {family.members.map((member) => (
          <li key={member.id} className="flex items-center gap-2 bg-white border rounded px-3 py-2">
            {member.picture && (
              <img src={member.picture} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
            )}
            <span className="flex-1 text-sm">
              {member.name ?? member.email}
              {member.id === family.ownerId && <span className="text-xs text-gray-400 ml-1">(owner)</span>}
            </span>
            {isOwner && member.id !== family.ownerId && (
              <button
                onClick={() => removeMember.mutate(member.id)}
                className="text-gray-400 hover:text-red-500 text-sm px-2 py-1"
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      {family.invites.length > 0 && (
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium text-gray-500">Pending invites sent</h2>
          <ul className="flex flex-col gap-1">
            {family.invites.map((invite) => (
              <li key={invite.id} className="flex items-center gap-2 bg-gray-50 border rounded px-3 py-2">
                <span className="flex-1 text-sm text-gray-600">{invite.email}</span>
                <span className="text-xs text-gray-400">Pending</span>
                <button
                  onClick={() => removeInvite.mutate(invite.id)}
                  className="text-sm text-gray-400 hover:text-red-500 px-2 py-1"
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleInvite} className="flex gap-2 flex-wrap">
        <input
          type="email"
          placeholder="Add by email..."
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          className="flex-1 min-w-[10rem] border rounded px-3 py-2 text-base sm:text-sm"
        />
        <button
          type="submit"
          disabled={inviteToFamily.isPending}
          className="bg-terracotta-600 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
        >
          Invite
        </button>
      </form>
      {inviteMessage && <p className="text-sm text-gray-600">{inviteMessage}</p>}
    </div>
  );
}
