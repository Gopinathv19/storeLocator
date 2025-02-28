import { supabase } from "../db/supabase_initialize";
import { planDetails } from "../configs/plan_details_variables";
import { removeGid } from "../helper/removeGID";

export const storeDataInsert = async (
  storeName,
  storeDomain,
  storeEmail,
  uuid,
  accessToken,
) => {
  try {
    const { data: existingStore, error: existingStoreError } = await supabase
      .from("stores")
      .select("*")
      .eq("store_name", storeName);
    if (existingStoreError) {
      return {
        status: 400,
        message: existingStoreError.message,
        data: null,
      };
    }
    if (existingStore.length === 0) {
      const { data: saveStoreData, error: saveStoreDataError } = await supabase
        .from("stores")
        .insert({
          uuid: uuid,
          store_name: storeName,
          store_domain: storeDomain,
          store_email: storeEmail,
          shopify_access_token: accessToken,
    });
      if (saveStoreDataError) {
        return {
          status: 400,
          message: saveStoreDataError.message,
          data: null,
        };
      }
      return {
        status: 200,
        message: "Store Data successfully Inserted",
        data: null,
      };
    } else {
      return {
        status: 200,
        message: "The store Data already There",
        data: null,
      };
    }
  } catch (error) {
    return {
      status: 400,
      message: error,
      data: null,
    };
  }
};

export const planUpdateToDatabase = async (admin, storeName, planName ) => {
  if(planName === 'freePlan'){
    const {data:planUpdate, error: planUpdateError} = await supabase.from('stores').update({plan_name: planName, is_free_planned:true}).eq('store_name', storeName);
    if(planUpdateError){
      return {
        status: 400,
        message: planUpdateError.message,
        data: null
      }
    }
    return {
      status: 200,
      message: "Plan Updated Successfully",
      data: null
    }
  }
}

export const saveChargeId = async (storeName, paymentStatus, paymentId, planName) => {
  console.log(paymentId, paymentStatus, planName, storeName)
  try{
    const {data: storeData, error: storeDataError} = await supabase.from('stores').update({plan_name:planName, is_free_planned: false, charge_id: removeGid(paymentId), payment_status: paymentStatus }).eq('store_name', storeName);
    if(storeDataError){
      return {
        status: 400,
        message: storeDataError.message, 
        data: null
      }
    }
    return {
      status: 200,
      message: "Plan Details saved successfully",
      data: null
    }
  }catch(error){
    return {
      status: 400,
      message: "Something went wrong",
      data: null
    }
  }
}
