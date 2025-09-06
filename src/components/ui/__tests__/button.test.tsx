import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { Button } from '../button';

describe('Button', () => {
  it('should call onClick when clicked', () => {
    const onClick = jest.fn();
    const { getByText } = render(<Button onClick={onClick}>Click me</Button>);
    fireEvent.click(getByText('Click me'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
