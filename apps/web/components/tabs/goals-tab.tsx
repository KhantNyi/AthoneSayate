"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { currency } from "@athonesayate/shared/metrics";
import { goalToDraft } from "@/lib/drafts";
import { isMissing, validateGoal } from "@/lib/validation";
import { useApp } from "../app-context";
import { FormAlert, INVALID_FIELD, Panel } from "../ui";

export default function GoalsTab() {
  const {
    t,
    goals,
    goalName,
    setGoalName,
    goalTargetAmount,
    setGoalTargetAmount,
    goalCurrentAmount,
    setGoalCurrentAmount,
    goalTargetDate,
    setGoalTargetDate,
    goalDrafts,
    setGoalDrafts,
    handleCreateGoal,
    handleUpdateGoal,
    handleDeleteGoal,
    editingGoalId,
    startEditingGoal,
    cancelEditingGoal,
    savingGoalId,
    formIssues,
    formAttempted
  } = useApp();

  const issues = formIssues.goal;
  const showIssues = formAttempted("goal");

  return (
    <Panel id="goals" title={t.goals} action={t.savingsProgress}>
      <form onSubmit={handleCreateGoal} noValidate className="mb-4 max-w-3xl rounded-lg border border-river/15 bg-river/5 p-3">
        <h3 className="mb-3 text-sm font-semibold uppercase text-river">Add savings goal</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1fr)_130px_130px_145px]">
          <input value={goalName} onChange={(event) => setGoalName(event.target.value)} aria-invalid={isMissing(issues, "name", showIssues) || undefined} className={`h-11 rounded-lg border bg-white px-3 text-sm ${isMissing(issues, "name", showIssues) ? INVALID_FIELD : "border-ink/10"}`} placeholder="Goal name" />
          <input value={goalTargetAmount} onChange={(event) => setGoalTargetAmount(event.target.value)} aria-invalid={isMissing(issues, "targetAmount", showIssues) || undefined} className={`h-11 rounded-lg border bg-white px-3 text-sm ${isMissing(issues, "targetAmount", showIssues) ? INVALID_FIELD : "border-ink/10"}`} inputMode="decimal" placeholder="Target" />
          <input value={goalCurrentAmount} onChange={(event) => setGoalCurrentAmount(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm" inputMode="decimal" placeholder="Saved now" />
          <input type="date" value={goalTargetDate} onChange={(event) => setGoalTargetDate(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm" />
          <FormAlert result={issues} show={showIssues} className="sm:col-span-2 lg:col-span-full" />
          <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-river px-4 text-sm font-semibold text-bright sm:col-span-2 lg:col-span-full">
            <Plus size={17} />
            Add goal
          </button>
        </div>
      </form>
      <div className="space-y-4">
        {goals.map((goal) => {
          const draft = goalDrafts[goal.id] ?? goalToDraft(goal);
          const isEditing = editingGoalId === goal.id;
          const goalProgress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
          const draftIssues = validateGoal({ action: "update this goal", name: draft.name, targetAmount: draft.targetAmount });

          return (
          <article key={goal.id} className={`rounded-lg border p-3 ${isEditing ? "border-river/25 bg-river/5" : "border-ink/10 bg-white"}`}>
            <div className="mb-2 grid gap-3 text-sm md:grid-cols-[1fr_auto] md:items-center">
              <div className="min-w-0">
                <p className="font-medium">{goal.name}</p>
                <p className="text-ink/60">{currency.format(goal.currentAmount)} saved / {currency.format(goal.targetAmount)} target</p>
              </div>
              {isEditing ? (
                <form onSubmit={(event) => handleUpdateGoal(event, goal.id)} noValidate className="grid gap-2 sm:grid-cols-2 md:w-[560px] md:grid-cols-[minmax(0,1fr)_110px_110px_132px_auto_auto]">
                  <input value={draft.name} onChange={(event) => setGoalDrafts((current) => ({ ...current, [goal.id]: { ...draft, name: event.target.value } }))} aria-invalid={isMissing(draftIssues, "name") || undefined} className={`h-10 min-w-0 rounded-lg border bg-white px-3 text-sm ${isMissing(draftIssues, "name") ? INVALID_FIELD : "border-ink/10"}`} placeholder="Name" />
                  <input value={draft.targetAmount} onChange={(event) => setGoalDrafts((current) => ({ ...current, [goal.id]: { ...draft, targetAmount: event.target.value } }))} aria-invalid={isMissing(draftIssues, "targetAmount") || undefined} className={`h-10 min-w-0 rounded-lg border bg-white px-3 text-sm ${isMissing(draftIssues, "targetAmount") ? INVALID_FIELD : "border-ink/10"}`} inputMode="decimal" placeholder="Target" />
                  <input value={draft.currentAmount} onChange={(event) => setGoalDrafts((current) => ({ ...current, [goal.id]: { ...draft, currentAmount: event.target.value } }))} className="h-10 min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm" inputMode="decimal" placeholder="Saved" />
                  <input type="date" value={draft.targetDate} onChange={(event) => setGoalDrafts((current) => ({ ...current, [goal.id]: { ...draft, targetDate: event.target.value } }))} className="h-10 min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm" />
                  <button className="h-10 rounded-lg bg-river px-3 text-sm font-semibold text-bright disabled:opacity-50" disabled={savingGoalId === goal.id}>
                    {savingGoalId === goal.id ? "Saving" : "Update"}
                  </button>
                  <button type="button" aria-label="Cancel goal edit" onClick={() => cancelEditingGoal(goal)} className="grid size-10 place-items-center rounded-lg border border-ink/10 bg-white text-ink/55 transition hover:bg-ink/5 hover:text-ink">
                    <X size={16} />
                  </button>
                  <FormAlert result={draftIssues} className="sm:col-span-2 md:col-span-full" />
                </form>
              ) : (
                <div className="inline-flex justify-end gap-1">
                  <button type="button" aria-label="Edit goal" onClick={() => startEditingGoal(goal)} className="grid size-10 place-items-center rounded-lg text-ink/45 transition hover:bg-river/10 hover:text-river">
                    <Pencil size={16} />
                  </button>
                  <button type="button" aria-label="Delete goal" onClick={() => handleDeleteGoal(goal.id)} className="grid size-10 place-items-center rounded-lg text-ink/45 transition hover:bg-coral/10 hover:text-coral">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-ink/10">
              <div className="h-full rounded-full" style={{ width: `${goalProgress}%`, background: goal.color }} />
            </div>
          </article>
          );
        })}
      </div>
    </Panel>
  );
}
