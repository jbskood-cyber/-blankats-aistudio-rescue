import { getSupabaseAdmin } from "./supabase";
import { getCheckoutMode } from "./checkout-mode";

export interface Order {
  id: string;
  created_at?: string;
  updated_at?: string;
  customer_email?: string | null;
  amount: number;
  currency: string;
  status: "pending" | "approved" | "rejected" | "expired";
  payment_provider: string;
  mercado_pago_preference_id?: string | null;
  mercado_pago_payment_id?: string | null;
  analysis_json: any;
  improved_cv_json: any;
  original_file_name?: string | null;
  download_token?: string | null;
  paid_at?: string | null;
}

// In-memory fallback database for development when Supabase keys are not set yet
const inMemoryOrders = new Map<string, Order>();

function canUseInMemoryFallback() {
  const isProduction = process.env.NODE_ENV === "production";
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  return !isProduction || isDemoMode || getCheckoutMode() === "mock";
}

export async function createOrder(order: Omit<Order, "created_at" | "updated_at">): Promise<Order> {
  const supabase = getSupabaseAdmin();
  const timestamp = new Date().toISOString();
  
  const fullOrder: Order = {
    ...order,
    created_at: timestamp,
    updated_at: timestamp,
  };

  const allowFallback = canUseInMemoryFallback();

  if (!supabase) {
    if (!allowFallback) {
      throw new Error("Supabase is not configured. Real database is required in production.");
    }
    console.log("Using in-memory store for creating order:", fullOrder.id);
    inMemoryOrders.set(fullOrder.id, fullOrder);
    return fullOrder;
  }

  try {
    const { data, error } = await supabase
      .from("orders")
      .insert({
        id: fullOrder.id,
        amount: fullOrder.amount,
        currency: fullOrder.currency,
        status: fullOrder.status,
        payment_provider: fullOrder.payment_provider,
        customer_email: fullOrder.customer_email || null,
        mercado_pago_preference_id: fullOrder.mercado_pago_preference_id || null,
        mercado_pago_payment_id: fullOrder.mercado_pago_payment_id || null,
        analysis_json: fullOrder.analysis_json,
        improved_cv_json: fullOrder.improved_cv_json,
        original_file_name: fullOrder.original_file_name || null,
        download_token: fullOrder.download_token || null,
        paid_at: fullOrder.paid_at || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert order error:", error);
      if (!allowFallback) {
        throw new Error(`Failed to insert order into Supabase: ${error.message}`);
      }
      // Fallback in case of database table not created yet or permission issues
      inMemoryOrders.set(fullOrder.id, fullOrder);
      return fullOrder;
    }

    return data as Order;
  } catch (err: any) {
    console.error("Unexpected error in Supabase createOrder:", err);
    if (!allowFallback) {
      throw err;
    }
    inMemoryOrders.set(fullOrder.id, fullOrder);
    return fullOrder;
  }
}

export async function getOrderById(id: string): Promise<Order | null> {
  const supabase = getSupabaseAdmin();

  const allowFallback = canUseInMemoryFallback();

  if (!supabase) {
    if (!allowFallback) {
      throw new Error("Supabase is not configured. Real database is required in production.");
    }
    console.log("Using in-memory store for retrieving order:", id);
    return inMemoryOrders.get(id) || null;
  }

  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Supabase get order error:", error);
      if (!allowFallback) {
        throw new Error(`Failed to fetch order from Supabase: ${error.message}`);
      }
      return inMemoryOrders.get(id) || null;
    }

    if (data) {
      return data as Order;
    }

    if (!allowFallback) {
      return null;
    }
    return inMemoryOrders.get(id) || null;
  } catch (err: any) {
    console.error("Unexpected error in Supabase getOrderById:", err);
    if (!allowFallback) {
      throw err;
    }
    return inMemoryOrders.get(id) || null;
  }
}

export async function getOrderByPreferenceId(preferenceId: string): Promise<Order | null> {
  const supabase = getSupabaseAdmin();

  const allowFallback = canUseInMemoryFallback();

  if (!supabase) {
    if (!allowFallback) {
      throw new Error("Supabase is not configured. Real database is required in production.");
    }
    console.log("Using in-memory store for searching order by preference_id:", preferenceId);
    for (const order of inMemoryOrders.values()) {
      if (order.mercado_pago_preference_id === preferenceId) {
        return order;
      }
    }
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("mercado_pago_preference_id", preferenceId)
      .maybeSingle();

    if (error) {
      console.error("Supabase get order by preference ID error:", error);
      if (!allowFallback) {
        throw new Error(`Failed to fetch order by preference from Supabase: ${error.message}`);
      }
      for (const order of inMemoryOrders.values()) {
        if (order.mercado_pago_preference_id === preferenceId) {
          return order;
        }
      }
      return null;
    }

    if (data) {
      return data as Order;
    }

    if (!allowFallback) {
      return null;
    }

    for (const order of inMemoryOrders.values()) {
      if (order.mercado_pago_preference_id === preferenceId) {
        return order;
      }
    }
    return null;
  } catch (err: any) {
    console.error("Unexpected error in Supabase getOrderByPreferenceId:", err);
    if (!allowFallback) {
      throw err;
    }
    for (const order of inMemoryOrders.values()) {
      if (order.mercado_pago_preference_id === preferenceId) {
        return order;
      }
    }
    return null;
  }
}

export async function getOrderByDownloadToken(downloadToken: string): Promise<Order | null> {
  const supabase = getSupabaseAdmin();
  const allowFallback = canUseInMemoryFallback();

  if (!supabase) {
    if (!allowFallback) {
      throw new Error("Supabase is not configured. Real database is required in production.");
    }
    for (const order of inMemoryOrders.values()) {
      if (order.download_token === downloadToken) {
        return order;
      }
    }
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("download_token", downloadToken)
      .maybeSingle();

    if (error) {
      console.error("Supabase get order by download token error:", error);
      if (!allowFallback) {
        throw new Error(`Failed to fetch order by download token from Supabase: ${error.message}`);
      }
      for (const order of inMemoryOrders.values()) {
        if (order.download_token === downloadToken) {
          return order;
        }
      }
      return null;
    }

    if (data) {
      return data as Order;
    }

    if (!allowFallback) {
      return null;
    }

    for (const order of inMemoryOrders.values()) {
      if (order.download_token === downloadToken) {
        return order;
      }
    }
    return null;
  } catch (err: any) {
    console.error("Unexpected error in getOrderByDownloadToken:", err);
    if (!allowFallback) {
      throw err;
    }
    for (const order of inMemoryOrders.values()) {
      if (order.download_token === downloadToken) {
        return order;
      }
    }
    return null;
  }
}

export async function updateOrderStatus(
  id: string,
  status: "pending" | "approved" | "rejected" | "expired",
  paymentId?: string | null,
  paidAt?: string | null
): Promise<Order | null> {
  const supabase = getSupabaseAdmin();
  const timestamp = new Date().toISOString();

  const allowFallback = canUseInMemoryFallback();

  // Only update in-memory if fallback is allowed
  let localOrder = null;
  if (allowFallback) {
    localOrder = inMemoryOrders.get(id);
    if (localOrder) {
      localOrder.status = status;
      localOrder.updated_at = timestamp;
      if (paymentId) localOrder.mercado_pago_payment_id = paymentId;
      if (paidAt) localOrder.paid_at = paidAt;
      inMemoryOrders.set(id, localOrder);
    }
  }

  if (!supabase) {
    if (!allowFallback) {
      throw new Error("Supabase is not configured. Real database is required in production.");
    }
    console.log("Using in-memory store for updating order status:", id, status);
    return localOrder || null;
  }

  try {
    const updatePayload: Partial<Order> & { updated_at: string } = {
      status,
      updated_at: timestamp,
    };
    if (paymentId) updatePayload.mercado_pago_payment_id = paymentId;
    if (paidAt) updatePayload.paid_at = paidAt;

    const { data, error } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase update order error:", error);
      if (!allowFallback) {
        throw new Error(`Failed to update order in Supabase: ${error.message}`);
      }
      return localOrder || null;
    }

    return data as Order;
  } catch (err: any) {
    console.error("Unexpected error in Supabase updateOrderStatus:", err);
    if (!allowFallback) {
      throw err;
    }
    return localOrder || null;
  }
}
