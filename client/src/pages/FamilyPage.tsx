import { useState } from "react";
import { useCurrentUser } from "../api/auth.js";
import { useCreateFamily, useFamily, useInviteToFamily, useRemoveFamilyMember } from "../api/family.js";

export function FamilyPage() {
  const { data: user } = useCurrentUser();
  const { data: family, isLoading } = useFamily();
  const createFamily = useCreateFamily();
  const inviteToFamily = useInviteToFamily();
  const removeMember = useRemoveFamilyMember();

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
      const result = await inviteToFamily.mutateAsync(email);
      setInviteMessage(
        result.status === "added" ? `${email} was added to your family.` : `Invite sent — ${email} will join automatically when they sign in.`
      );
      setInviteEmail("");
    } catch (err) {
      setInviteMessage(err instanceof Error ? err.message : "Failed to send invite");
    }
  }

  if (isLoading) return <p className="text-gray-500 px-4 py-6">Loading...</p>;

  if (!family) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Family</h1>
        <p className="text-sm text-gray-600">
          Create a family to share your recipes, meal plan, and shopping list with other people. Your existing
          recipes and plans will move into the family.
        </p>
        <form onSubmit={handleCreate} className="flex gap-2 flex-wrap">
          <input
            placeholder="Family name (optional)"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            className="flex-1 min-w-[10rem] border rounded px-3 py-2 text-base sm:text-sm"
          />
          <button
            type="submit"
            disabled={createFamily.isPending}
            className="bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            Create family
          </button>
        </form>
      </div>
    );
  }

  const isOwner = user?.id === family.ownerId;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-gray-800">{family.name || "Your family"}</h1>

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
          className="bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
        >
          Invite
        </button>
      </form>
      {inviteMessage && <p className="text-sm text-gray-600">{inviteMessage}</p>}
    </div>
  );
}
