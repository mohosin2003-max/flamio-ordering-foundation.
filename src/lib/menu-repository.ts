import { queryOptions } from "@tanstack/react-query";

import { categories, products } from "@/data/menu";
import { paymentMethods, promoBanners, restaurant } from "@/data/restaurant";
import type { Category, Product } from "@/types/menu";

/**
 * Single read layer for menu data. Today it resolves the local seed data;
 * later it can call server functions backed by the database without changing
 * a single component.
 */

function visibleCategories(): Category[] {
  return categories.filter((c) => c.isVisible).sort((a, b) => a.sortOrder - b.sortOrder);
}

function availableProducts(): Product[] {
  const visibleIds = new Set(visibleCategories().map((c) => c.id));
  return products
    .filter((p) => visibleIds.has(p.categoryId))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export const menuQueryOptions = () =>
  queryOptions({
    queryKey: ["menu"],
    queryFn: async () => ({
      categories: visibleCategories(),
      products: availableProducts(),
    }),
    staleTime: 5 * 60 * 1000,
  });

export const productQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: async () => {
      const product = availableProducts().find((p) => p.slug === slug) ?? null;
      const category = product
        ? (visibleCategories().find((c) => c.id === product.categoryId) ?? null)
        : null;
      const related = product
        ? availableProducts()
            .filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
            .slice(0, 4)
        : [];
      return { product, category, related };
    },
    staleTime: 5 * 60 * 1000,
  });

export const restaurantQueryOptions = () =>
  queryOptions({
    queryKey: ["restaurant"],
    queryFn: async () => ({
      restaurant,
      banners: promoBanners.filter((b) => b.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
      paymentMethods,
    }),
    staleTime: 5 * 60 * 1000,
  });

/** Lowest sellable price for a product (base price or cheapest variant). */
export function displayPrice(product: Product): number {
  const enabled = product.variants.filter((v) => v.isAvailable);
  if (enabled.length === 0) return product.basePrice;
  return Math.min(...enabled.map((v) => v.price));
}

export function hasVariants(product: Product): boolean {
  return product.variants.some((v) => v.isAvailable);
}

export function primaryImage(product: Product): string | null {
  return (product.images.find((i) => i.isPrimary) ?? product.images[0])?.url ?? null;
}
