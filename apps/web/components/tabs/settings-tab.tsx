"use client";

import { BellRing, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { currency } from "@athonesayate/shared/metrics";
import type { AccountType } from "@athonesayate/shared/types";
import { accountToDraft } from "@/lib/drafts";
import { disablePushNotifications, enablePushNotifications, getCurrentPushSubscription } from "@/lib/push";
import { isMissing, validateAccount } from "@/lib/validation";
import { useApp } from "../app-context";
import { CategoryManager } from "../category-manager";
import { FormAlert, INVALID_FIELD, Panel } from "../ui";

function BillRemindersCard() {
  const [status, setStatus] = useState<"loading" | "off" | "on" | "busy">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let ignore = false;
    getCurrentPushSubscription()
      .then((subscription) => {
        if (!ignore) {
          setStatus(subscription ? "on" : "off");
        }
      })
      .catch(() => {
        if (!ignore) {
          setStatus("off");
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  async function toggle() {
    setMessage("");
    const enabled = status === "on";
    setStatus("busy");

    if (enabled) {
      await disablePushNotifications();
      setStatus("off");
      setMessage("Bill reminders turned off on this device.");
      return;
    }

    const result = await enablePushNotifications();
    if (result.status === "enabled") {
      setStatus("on");
      setMessage("You'll get a notification when a bill is due.");
    } else {
      setStatus("off");
      setMessage(
        result.status === "denied"
          ? "Notifications are blocked for this site. Allow them in your browser settings first."
          : result.status === "unsupported"
            ? result.reason
            : result.message
      );
    }
  }

  return (
    <div className="rounded-lg border border-ink/10 bg-white p-3">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber/12 text-amber">
            <BellRing size={19} />
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold">Bill reminders</h3>
            <p className="mt-0.5 text-xs text-ink/55">
              Get a push notification on this device when a recurring bill is due or overdue.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={status === "loading" || status === "busy"}
          className={`h-10 rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            status === "on"
              ? "border border-ink/10 bg-white text-ink/60 hover:bg-ink/[0.04]"
              : "bg-river text-bright hover:bg-river/85"
          }`}
        >
          {status === "loading" ? "Checking..." : status === "busy" ? "Working..." : status === "on" ? "Turn off" : "Enable reminders"}
        </button>
      </div>
      {message ? <p className="mt-2 text-xs text-ink/55">{message}</p> : null}
    </div>
  );
}

export default function SettingsTab() {
  const {
    balances,
    accountDrafts,
    setAccountDrafts,
    editingAccountId,
    startEditingAccount,
    cancelEditingAccount,
    handleUpdateAccount,
    handleDeleteAccount,
    savingAccountId,
    displayCategories,
    subcategories,
    newCategoryName,
    setNewCategoryName,
    newCategoryKind,
    setNewCategoryKind,
    newCategoryBudget,
    setNewCategoryBudget,
    newSubcategoryName,
    setNewSubcategoryName,
    newSubcategoryCategoryId,
    setNewSubcategoryCategoryId,
    formIssues,
    formAttempted,
    handleCreateCategory,
    handleCreateSubcategory,
    handleUpdateCategory,
    handleDeleteCategory,
    handleUpdateSubcategory,
    handleDeleteSubcategory
  } = useApp();

  return (
    <Panel id="settings" title="Settings" action="Manage accounts, categories and subcategories">
      <div className="grid gap-4">
        <BillRemindersCard />

        <div className="rounded-lg border border-ink/10 bg-white p-3">
          <h3 className="mb-3 font-semibold">Banking accounts</h3>
          <div className="grid gap-2">
            {balances.map((account) => {
              const draft = accountDrafts[account.id] ?? accountToDraft(account);
              const isEditing = editingAccountId === account.id;
              const accountIssues = validateAccount({
                action: "update this account",
                name: draft.name,
                openingBalance: draft.openingBalance
              });

              return (
                <article key={account.id} className={`rounded-lg border p-2 ${isEditing ? "border-river/25 bg-river/5" : "border-ink/10"}`}>
                  <div className={`grid min-w-0 gap-2 md:items-center ${isEditing ? "" : "md:grid-cols-[minmax(0,1fr)_auto]"}`}>
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="size-3 rounded-full" style={{ background: account.color }} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{account.name}</p>
                        <p className="mt-1 text-xs text-ink/55">{account.type.replace("_", " ")} - Current balance: {currency.format(account.balance)}</p>
                      </div>
                    </div>
                    {isEditing ? (
                      <form onSubmit={(event) => handleUpdateAccount(event, account.id)} noValidate className="grid gap-2 w-full md:grid-cols-3 md:items-center">
                        <input value={draft.name} onChange={(event) => setAccountDrafts((current) => ({ ...current, [account.id]: { ...draft, name: event.target.value } }))} aria-invalid={isMissing(accountIssues, "name") || undefined} className={`h-10 w-full rounded-lg border bg-white px-3 text-sm font-semibold ${isMissing(accountIssues, "name") ? INVALID_FIELD : "border-ink/10"}`} placeholder="Account name" />
                        <select value={draft.type} onChange={(event) => setAccountDrafts((current) => ({ ...current, [account.id]: { ...draft, type: event.target.value as AccountType } }))} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm">
                          <option value="cash">Cash</option>
                          <option value="checking">Checking</option>
                          <option value="savings">Savings</option>
                          <option value="credit_card">Credit card</option>
                          <option value="wallet">Wallet</option>
                          <option value="investment">Investment</option>
                        </select>
                        <input value={draft.openingBalance} onChange={(event) => setAccountDrafts((current) => ({ ...current, [account.id]: { ...draft, openingBalance: event.target.value } }))} aria-invalid={isMissing(accountIssues, "openingBalance") || undefined} className={`h-10 rounded-lg border bg-white px-3 text-sm ${isMissing(accountIssues, "openingBalance") ? INVALID_FIELD : "border-ink/10"}`} inputMode="decimal" placeholder="Opening" />
                        <input type="color" value={draft.color} onChange={(event) => setAccountDrafts((current) => ({ ...current, [account.id]: { ...draft, color: event.target.value } }))} className="h-10 w-full rounded-lg border border-ink/10 bg-white px-2" aria-label="Account color" />
                        <button className="h-10 rounded-lg bg-river px-3 text-sm font-semibold text-bright disabled:opacity-50" disabled={savingAccountId === account.id}>
                          {savingAccountId === account.id ? "Saving" : "Update"}
                        </button>
                        <button type="button" aria-label="Cancel account edit" onClick={() => cancelEditingAccount(account)} className="grid size-10 place-items-center rounded-lg border border-ink/10 bg-white text-ink/55 transition hover:bg-ink/5 hover:text-ink">
                          <X size={16} />
                        </button>
                        <FormAlert result={accountIssues} className="md:col-span-full" />
                      </form>
                    ) : (
                      <div className="inline-flex justify-end gap-1">
                        <button type="button" aria-label="Edit account" onClick={() => startEditingAccount(account)} className="grid size-10 place-items-center rounded-lg text-ink/45 transition hover:bg-river/10 hover:text-river">
                          <Pencil size={16} />
                        </button>
                        <button type="button" aria-label="Delete account" onClick={() => handleDeleteAccount(account.id)} className="grid size-10 place-items-center rounded-lg text-ink/45 transition hover:bg-coral/10 hover:text-coral">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <CategoryManager
          categories={displayCategories}
          subcategories={subcategories}
          newCategoryName={newCategoryName}
          newCategoryKind={newCategoryKind}
          newCategoryBudget={newCategoryBudget}
          newSubcategoryName={newSubcategoryName}
          newSubcategoryCategoryId={newSubcategoryCategoryId}
          categoryIssues={formIssues.category}
          categoryAttempted={formAttempted("category")}
          subcategoryIssues={formIssues.subcategory}
          subcategoryAttempted={formAttempted("subcategory")}
          onCategoryNameChange={setNewCategoryName}
          onCategoryKindChange={setNewCategoryKind}
          onCategoryBudgetChange={setNewCategoryBudget}
          onSubcategoryNameChange={setNewSubcategoryName}
          onSubcategoryCategoryChange={setNewSubcategoryCategoryId}
          onCreateCategory={handleCreateCategory}
          onCreateSubcategory={handleCreateSubcategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
          onUpdateSubcategory={handleUpdateSubcategory}
          onDeleteSubcategory={handleDeleteSubcategory}
        />
      </div>
    </Panel>
  );
}
