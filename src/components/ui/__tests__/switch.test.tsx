import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { Switch } from '../switch';

describe('Switch', () => {
  it('should call onClick when clicked', () => {
    const onClick = jest.fn();
    const { getByRole } = render(<Switch onClick={onClick} />);
    fireEvent.click(getByRole('switch'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
