declare module 'react-native-razorpay' {
  type RazorpayCheckoutOptions = {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description?: string;
    order_id: string;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    theme?: {
      color: string;
    };
    config?: {
      display?: {
        blocks?: Record<
          string,
          {
            name: string;
            instruments: Array<{
              method: 'upi' | 'card' | 'wallet' | 'netbanking' | 'emi';
            }>;
          }
        >;
        sequence?: string[];
        preferences?: {
          show_default_blocks?: boolean;
        };
      };
    };
  };

  type RazorpayCheckoutResponse = {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  };

  const RazorpayCheckout: {
    open(options: RazorpayCheckoutOptions): Promise<RazorpayCheckoutResponse>;
  };

  export default RazorpayCheckout;
}
