export type SerializedPlan = {
  _id?: string;
  title: string;
  type: string;
  planTitle: string;
  oldPrice: string;
  price: string;
  discount: string;
  buttonTitle: string;
  features: string[];
  stripePriceId?: string;
  iconType?: "BestValuePlan" | "PopularPlan" | "FreePlan";
  iconWrapperColor?: string;
};
