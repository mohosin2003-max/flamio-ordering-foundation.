import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";

/**
 * Public menu reads. The catalog is visible to everyone (guests + signed-in
 * customers), so these use a publishable-key client behind the public SELECT
 * policies on categories / products / product_variants / product_images.
 * Returns raw DB rows; the client repository maps them to domain types and
 * applies the bundled placeholder image fallback.
 */

export const getMenu = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const url = process.env["SUPABASE_URL"];
  if (!key || !url) return { categories: [], products: [], variants: [], images: [] };

  const supabase = createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        // New-format sb_ keys are opaque, not JWTs — send apikey only.
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });

  const { data: categories } = await supabase
    .from("categories")
    .select("id,slug,name,description,image_url,is_visible,sort_order")
    .eq("is_visible", true)
    .order("sort_order");

  const categoryIds = (categories ?? []).map((c) => c.id);
  let products: Database["public"]["Tables"]["products"]["Row"][] = [];
  if (categoryIds.length) {
    const { data } = await supabase
      .from("products")
      .select(
        "id,category_id,slug,name,description,base_price,is_available,is_featured,is_popular,badges,sort_order",
      )
      .in("category_id", categoryIds)
      .order("sort_order");
    products = data ?? [];
  }

  const productIds = products.map((p) => p.id);
  let variants: Database["public"]["Tables"]["product_variants"]["Row"][] = [];
  if (productIds.length) {
    const { data } = await supabase
      .from("product_variants")
      .select("id,product_id,name,price,is_available,sort_order")
      .in("product_id", productIds)
      .order("sort_order");
    variants = data ?? [];
  }

  let images: Database["public"]["Tables"]["product_images"]["Row"][] = [];
  if (productIds.length) {
    const { data } = await supabase
      .from("product_images")
      .select("id,product_id,url,alt,is_primary,sort_order")
      .in("product_id", productIds)
      .order("sort_order");
    images = data ?? [];
  }

  return { categories: categories ?? [], products, variants, images };
});

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    const url = process.env["SUPABASE_URL"];
    const empty = {
      product: null as Database["public"]["Tables"]["products"]["Row"] | null,
      variants: [] as Database["public"]["Tables"]["product_variants"]["Row"][],
      images: [] as Database["public"]["Tables"]["product_images"]["Row"][],
      category: null as Database["public"]["Tables"]["categories"]["Row"] | null,
      related: [] as Database["public"]["Tables"]["products"]["Row"][],
      relatedImages: [] as Database["public"]["Tables"]["product_images"]["Row"][],
    };
    if (!key || !url) return empty;

    const supabase = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
            headers.delete("Authorization");
          }
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });

    const { data: product } = await supabase
      .from("products")
      .select(
        "id,category_id,slug,name,description,base_price,is_available,is_featured,is_popular,badges,sort_order",
      )
      .eq("slug", data.slug)
      .maybeSingle();

    if (!product) return empty;

    const { data: category } = await supabase
      .from("categories")
      .select("id,slug,name,description,image_url,is_visible,sort_order")
      .eq("id", product.category_id)
      .maybeSingle();

    // A product in a hidden category is treated as not found.
    if (!category || !category.is_visible) return empty;

    const { data: variants } = await supabase
      .from("product_variants")
      .select("id,product_id,name,price,is_available,sort_order")
      .eq("product_id", product.id)
      .order("sort_order");

    const { data: images } = await supabase
      .from("product_images")
      .select("id,product_id,url,alt,is_primary,sort_order")
      .eq("product_id", product.id)
      .order("sort_order");

    const { data: related } = await supabase
      .from("products")
      .select(
        "id,category_id,slug,name,description,base_price,is_available,is_featured,is_popular,badges,sort_order",
      )
      .eq("category_id", product.category_id)
      .neq("id", product.id)
      .order("sort_order")
      .limit(4);

    const relatedIds = (related ?? []).map((r) => r.id);
    let relatedImages: Database["public"]["Tables"]["product_images"]["Row"][] = [];
    if (relatedIds.length) {
      const { data: ri } = await supabase
        .from("product_images")
        .select("id,product_id,url,alt,is_primary,sort_order")
        .in("product_id", relatedIds)
        .order("sort_order");
      relatedImages = ri ?? [];
    }

    return {
      product,
      variants: variants ?? [],
      images: images ?? [],
      category,
      related: related ?? [],
      relatedImages,
    };
  });
