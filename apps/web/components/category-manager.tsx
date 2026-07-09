"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { currency } from "@athonesayate/shared/metrics";
import type { Category, Subcategory, TransactionType } from "@athonesayate/shared/types";

export function CategoryManager({
  categories,
  subcategories,
  newCategoryName,
  newCategoryKind,
  newCategoryBudget,
  newSubcategoryName,
  newSubcategoryCategoryId,
  onCategoryNameChange,
  onCategoryKindChange,
  onCategoryBudgetChange,
  onSubcategoryNameChange,
  onSubcategoryCategoryChange,
  onCreateCategory,
  onCreateSubcategory,
  onUpdateCategory,
  onDeleteCategory,
  onUpdateSubcategory,
  onDeleteSubcategory
}: {
  categories: Category[];
  subcategories: Subcategory[];
  newCategoryName: string;
  newCategoryKind: TransactionType;
  newCategoryBudget: string;
  newSubcategoryName: string;
  newSubcategoryCategoryId: string;
  onCategoryNameChange: (value: string) => void;
  onCategoryKindChange: (value: TransactionType) => void;
  onCategoryBudgetChange: (value: string) => void;
  onSubcategoryNameChange: (value: string) => void;
  onSubcategoryCategoryChange: (value: string) => void;
  onCreateCategory: (event: FormEvent<HTMLFormElement>) => void;
  onCreateSubcategory: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateCategory: (id: string, input: { name: string; kind: TransactionType; monthlyBudget: string }) => void;
  onDeleteCategory: (id: string) => void;
  onUpdateSubcategory: (id: string, input: { categoryId: string; name: string }) => void;
  onDeleteSubcategory: (id: string) => void;
}) {
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, { name: string; kind: TransactionType; monthlyBudget: string }>>({});
  const [subcategoryDrafts, setSubcategoryDrafts] = useState<Record<string, { categoryId: string; name: string }>>({});
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [editingSubcategoryId, setEditingSubcategoryId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  useEffect(() => {
    setCategoryDrafts(Object.fromEntries(categories.map((category) => [category.id, {
      name: category.name,
      kind: category.kind,
      monthlyBudget: String(category.monthlyBudget ?? "")
    }])));
  }, [categories]);

  useEffect(() => {
    setSubcategoryDrafts(Object.fromEntries(subcategories.map((subcategory) => [subcategory.id, {
      categoryId: subcategory.categoryId,
      name: subcategory.name
    }])));
  }, [subcategories]);

  useEffect(() => {
    if (!categories.some((category) => category.id === selectedCategoryId)) {
      setSelectedCategoryId(categories[0]?.id ?? "");
    }
  }, [categories, selectedCategoryId]);

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId) ?? categories[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="grid gap-4">
        <form onSubmit={onCreateCategory} className="rounded-lg border border-river/15 bg-river/5 p-3">
          <h3 className="mb-3 text-sm font-semibold uppercase text-river">Create category</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={newCategoryName}
              onChange={(event) => onCategoryNameChange(event.target.value)}
              className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm"
              placeholder="Category name"
            />
            <select
              value={newCategoryKind}
              onChange={(event) => onCategoryKindChange(event.target.value as TransactionType)}
              className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <input
              value={newCategoryBudget}
              onChange={(event) => onCategoryBudgetChange(event.target.value)}
              className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm sm:col-span-2"
              inputMode="decimal"
              placeholder="Monthly budget, optional"
            />
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-river px-4 text-sm font-semibold text-bright sm:col-span-2">
              <Plus size={17} />
              Create category
            </button>
          </div>
        </form>

        <form onSubmit={onCreateSubcategory} className="rounded-lg border border-river/15 bg-river/5 p-3">
          <h3 className="mb-3 text-sm font-semibold uppercase text-river">Create subcategory</h3>
          <div className="grid gap-2">
            <select
              value={newSubcategoryCategoryId}
              onChange={(event) => onSubcategoryCategoryChange(event.target.value)}
              className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm"
            >
              <option value="">Choose category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <input
              value={newSubcategoryName}
              onChange={(event) => onSubcategoryNameChange(event.target.value)}
              className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm"
              placeholder="Subcategory name, e.g. Electricity"
            />
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-river px-4 text-sm font-semibold text-bright">
              <Plus size={17} />
              Create subcategory
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg border border-ink/10 bg-white p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase text-ink/55">Category library</h3>
            <span className="text-xs font-semibold text-ink/45">{categories.length}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => {
              const childCount = subcategories.filter((subcategory) => subcategory.categoryId === category.id).length;
              const selected = selectedCategory?.id === category.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(category.id);
                    setEditingCategoryId("");
                    setEditingSubcategoryId("");
                  }}
                  className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
                    selected ? "border-river/25 bg-river/10 text-river" : "border-ink/10 hover:bg-ink/[0.04]"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="size-3 shrink-0 rounded-full" style={{ background: category.color }} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{category.name}</span>
                      <span className="block text-xs text-ink/45">{category.kind} - {childCount} sub</span>
                    </span>
                  </span>
                  {category.monthlyBudget !== undefined ? <span className="shrink-0 text-xs font-semibold">{currency.format(category.monthlyBudget)}</span> : null}
                </button>
              );
            })}
          </div>
        </div>

        {categories.filter((category) => !selectedCategory || category.id === selectedCategory.id).map((category) => {
          const children = subcategories.filter((subcategory) => subcategory.categoryId === category.id);
          const isEditingCategory = editingCategoryId === category.id;
          const categoryDraft = categoryDrafts[category.id] ?? {
            name: category.name,
            kind: category.kind,
            monthlyBudget: String(category.monthlyBudget ?? "")
          };
          return (
            <div key={category.id} className={`rounded-lg border p-3 ${isEditingCategory ? "border-river/25 bg-river/5" : "border-ink/10 bg-white"}`}>
              <div className="mb-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="size-3 shrink-0 rounded-full" style={{ background: category.color }} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{category.name}</p>
                    <p className="mt-1 text-xs text-ink/55">
                      {category.kind}{category.monthlyBudget !== undefined ? ` - ${currency.format(category.monthlyBudget)} monthly budget` : ""}
                    </p>
                  </div>
                </div>
                {isEditingCategory ? (
                  <form onSubmit={(event) => {
                    event.preventDefault();
                    onUpdateCategory(category.id, categoryDraft);
                    setEditingCategoryId("");
                  }} className="grid gap-2 md:w-[520px] md:grid-cols-[minmax(0,1fr)_120px_120px_auto_auto]">
                    <input value={categoryDraft.name} onChange={(event) => setCategoryDrafts((current) => ({ ...current, [category.id]: { ...categoryDraft, name: event.target.value } }))} className="h-10 min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm font-semibold" placeholder="Category name" />
                    <select value={categoryDraft.kind} onChange={(event) => setCategoryDrafts((current) => ({ ...current, [category.id]: { ...categoryDraft, kind: event.target.value as TransactionType } }))} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm">
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                    <input value={categoryDraft.monthlyBudget} onChange={(event) => setCategoryDrafts((current) => ({ ...current, [category.id]: { ...categoryDraft, monthlyBudget: event.target.value } }))} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm" inputMode="decimal" placeholder="Budget" />
                    <button className="h-10 rounded-lg bg-river px-3 text-sm font-semibold text-bright">Update</button>
                    <button type="button" aria-label="Cancel category edit" onClick={() => {
                      setEditingCategoryId("");
                      setCategoryDrafts((current) => ({ ...current, [category.id]: { name: category.name, kind: category.kind, monthlyBudget: String(category.monthlyBudget ?? "") } }));
                    }} className="grid size-10 place-items-center rounded-lg border border-ink/10 bg-white text-ink/55 transition hover:bg-ink/5 hover:text-ink">
                      <X size={16} />
                    </button>
                  </form>
                ) : (
                  <div className="inline-flex justify-end gap-1">
                    <button type="button" aria-label="Edit category" onClick={() => setEditingCategoryId(category.id)} className="grid size-10 place-items-center rounded-lg text-ink/45 transition hover:bg-river/10 hover:text-river">
                      <Pencil size={16} />
                    </button>
                    <button type="button" aria-label="Delete category" onClick={() => onDeleteCategory(category.id)} className="grid size-10 place-items-center rounded-lg text-ink/45 transition hover:bg-coral/10 hover:text-coral">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                {children.length > 0 ? children.map((subcategory) => {
                  const subcategoryDraft = subcategoryDrafts[subcategory.id] ?? { categoryId: subcategory.categoryId, name: subcategory.name };
                  const isEditingSubcategory = editingSubcategoryId === subcategory.id;

                  return (
                    <div key={subcategory.id} className={`grid gap-2 rounded-lg p-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${isEditingSubcategory ? "bg-river/5" : "bg-ink/[0.03]"}`}>
                      <p className="min-w-0 truncate text-sm text-ink/75">{subcategory.name}</p>
                      {isEditingSubcategory ? (
                        <form onSubmit={(event) => {
                          event.preventDefault();
                          onUpdateSubcategory(subcategory.id, subcategoryDraft);
                          setEditingSubcategoryId("");
                        }} className="grid gap-2 sm:w-[420px] sm:grid-cols-[minmax(0,1fr)_minmax(150px,0.6fr)_auto_auto]">
                          <input value={subcategoryDraft.name} onChange={(event) => setSubcategoryDrafts((current) => ({ ...current, [subcategory.id]: { ...subcategoryDraft, name: event.target.value } }))} className="h-9 rounded-lg border border-ink/10 bg-white px-3 text-sm" placeholder="Subcategory" />
                          <select value={subcategoryDraft.categoryId} onChange={(event) => setSubcategoryDrafts((current) => ({ ...current, [subcategory.id]: { ...subcategoryDraft, categoryId: event.target.value } }))} className="h-9 rounded-lg border border-ink/10 bg-white px-3 text-sm">
                            {categories.map((item) => (
                              <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                          </select>
                          <button className="h-9 rounded-lg bg-river px-3 text-sm font-semibold text-bright">Update</button>
                          <button type="button" aria-label="Cancel subcategory edit" onClick={() => {
                            setEditingSubcategoryId("");
                            setSubcategoryDrafts((current) => ({ ...current, [subcategory.id]: { categoryId: subcategory.categoryId, name: subcategory.name } }));
                          }} className="grid size-9 place-items-center rounded-lg border border-ink/10 bg-white text-ink/55 transition hover:bg-ink/5 hover:text-ink">
                            <X size={15} />
                          </button>
                        </form>
                      ) : (
                        <div className="inline-flex justify-end gap-1">
                          <button type="button" aria-label="Edit subcategory" onClick={() => setEditingSubcategoryId(subcategory.id)} className="grid size-9 place-items-center rounded-lg text-ink/45 transition hover:bg-river/10 hover:text-river">
                            <Pencil size={15} />
                          </button>
                          <button type="button" aria-label="Delete subcategory" onClick={() => onDeleteSubcategory(subcategory.id)} className="grid size-9 place-items-center rounded-lg text-ink/45 transition hover:bg-coral/10 hover:text-coral">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <span className="text-sm text-ink/45">No subcategories yet</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
