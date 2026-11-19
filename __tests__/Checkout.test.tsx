import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import api from '../src/api';
import Checkout from '../src/User/Cart/Checkout';

jest.mock('../src/api', () => ({
  __esModule: true,
  API_BASE_URL: 'http://localhost/api',
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('@react-native-community/geolocation', () => ({
  __esModule: true,
  default: {
    getCurrentPosition: jest.fn(),
    requestAuthorization: jest.fn(),
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const cartItem = {
  id: 8,
  product_id: 3,
  item_type: 'product' as const,
  name: 'Oak side table',
  quantity: 1,
  price: 1000,
};

const savedAddress = {
  id: 2,
  label: 'Home',
  customer_name: 'A User',
  customer_phone: '9876543210',
  street_address: '1 Main Street',
  city: 'Chennai',
  state: 'Tamil Nadu',
  country: 'India',
  zip_code: '600001',
  is_default: true,
};

describe('Checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(api.get).mockResolvedValue({ data: [savedAddress] } as never);
  });

  it('uses the backend GST quote for the displayed total', async () => {
    jest.mocked(api.post).mockResolvedValue({
      data: {
        subtotal: 1000,
        gst_rate: 18,
        gst_amount: 180,
        shipping_amount: 0,
        total_amount: 1180,
      },
    } as never);

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <Checkout
          items={[cartItem]}
          onBack={jest.fn()}
          onOrderPlaced={jest.fn()}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(api.post).toHaveBeenCalledWith(
      '/checkout/quote',
      expect.objectContaining({ address_id: savedAddress.id }),
    );
    const text = renderer!.root.findAllByType(Text);
    expect(text.some(node => node.props.children === 'GST (18%)')).toBe(true);
    expect(text.some(node => node.props.children === '₹1,180')).toBe(true);
  });

  it('does not enable order placement when the backend omits GST', async () => {
    jest.mocked(api.post).mockResolvedValue({
      data: { subtotal: 1000, total_amount: 1000 },
    } as never);

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <Checkout
          items={[cartItem]}
          onBack={jest.fn()}
          onOrderPlaced={jest.fn()}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const text = renderer!.root.findAllByType(Text);
    expect(
      text.some(
        node =>
          typeof node.props.children === 'string' &&
          node.props.children.includes(
            'GST and the final total must be confirmed by the server',
          ),
      ),
    ).toBe(true);
  });
});
