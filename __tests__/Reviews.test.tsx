import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import api from '../src/api';
import Reviews from '../src/User/Home/Reviews';

jest.mock('../src/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock('lucide-react-native', () => ({
  Star: () => null,
}));

describe('Reviews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches user-visible reviews and displays only published reviews', async () => {
    jest.mocked(api.get).mockResolvedValue({
      data: [
        {
          id: 1,
          status: 'published',
          customer_name: 'Published customer',
          review: 'Great quality',
          rating: 5,
        },
        {
          id: 2,
          status: 'pending',
          customer_name: 'Pending customer',
          review: 'Not visible yet',
          rating: 4,
        },
      ],
    } as never);

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<Reviews />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(api.get).toHaveBeenCalledWith('/reviews/published');
    const text = renderer!.root.findAllByType(Text);
    expect(text.some(node => node.props.children === 'Published customer')).toBe(true);
    expect(text.some(node => node.props.children === 'Pending customer')).toBe(false);
  });
});
