import { getSupabaseAdmin } from "./supabase";

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

export async function createOrder(order: Omit<Order, "created_at" | "updated_at">): Promise<Order> {
  const supabase = getSupabaseAdmin();
  const timestamp = new Date().toISOString();
  
  const fullOrder: Order = {
    ...order,
    created_at: timestamp,
    updated_at: timestamp,
  };

  if (!supabase) {
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
      // Fallback in case of database table not created yet or permission issues
      inMemoryOrders.set(fullOrder.id, fullOrder);
      return fullOrder;
    }

    return data as Order;
  } catch (err) {
    console.error("Unexpected error in Supabase createOrder:", err);
    inMemoryOrders.set(fullOrder.id, fullOrder);
    return fullOrder;
  }
}

export async function getOrderById(id: string): Promise<Order | null> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
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
      return inMemoryOrders.get(id) || null;
    }

    if (data) {
      return data as Order;
    }

    return inMemoryOrders.get(id) || null;
  } catch (err) {
    console.error("Unexpected error in Supabase getOrderById:", err);
    return inMemoryOrders.get(id) || null;
  }
}

export async function getOrderByPreferenceId(preferenceId: string): Promise<Order | null> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
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

    for (const order of inMemoryOrders.values()) {
      if (order.mercado_pago_preference_id === preferenceId) {
        return order;
      }
    }
    return null;
  } catch (err) {
    console.error("Unexpected error in Supabase getOrderByPreferenceId:", err);
    for (const order of inMemoryOrders.values()) {
      if (order.mercado_pago_preference_id === preferenceId) {
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

  // Always update in-memory
  const localOrder = inMemoryOrders.get(id);
  if (localOrder) {
    localOrder.status = status;
    localOrder.updated_at = timestamp;
    if (paymentId) localOrder.mercado_pago_payment_id = paymentId;
    if (paidAt) localOrder.paid_at = paidAt;
    inMemoryOrders.set(id, localOrder);
  }

  if (!supabase) {
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
      return localOrder || null;
    }

    return data as Order;
  } catch (err) {
    console.error("Unexpected error in Supabase updateOrderStatus:", err);
    return localOrder || null;
  }
}
