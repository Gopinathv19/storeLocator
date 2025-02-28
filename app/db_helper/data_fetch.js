import { supabase } from "../db/supabase_initialize";

export const fetchPaymentDetailsFromDb = async (storeName) => {
  try {
    const { data: paymentData, error: paymentDataError } = await supabase
      .from("stores")
      .select("*")
      .eq("store_name", storeName);
    if (paymentDataError) {
      return {
        status: 400,
        mesage: paymentDataError.message,
        data: null,
      };
    }
    
    return {
      status: 200,
      message: "Payment Details fetched successfully from DB",
      data: paymentData[0].plan_name,
    };
  } catch (error) {
    return {
      status: 400,
      message: error,
      data: null,
    };
  }
};
