import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { Checkbox } from '../checkbox';

describe('Checkbox', () => {
  it('should call onClick when clicked', () => {
    const onClick = jest.fn();
    const { getByRole } = render(<Checkbox onClick={onClick} />);
    fireEvent.click(getByRole('checkbox'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
