import React from 'react';
import { render, act } from '@testing-library/react';
import TouchScrollBar from "./alphabetic-scroll";

const mockScrollToAnchor = jest.fn(anchor => false);
const mockAnchorList = ['a', 'b', 'z'];

beforeEach(() => {
  mockScrollToAnchor.mockReset();
});

it('should render the anchor list into li components', () => {
  const {getByText} = render(<TouchScrollBar anchorList={mockAnchorList} scrollToAnchor={() => false}/>);
  mockAnchorList.forEach(anchor => expect(getByText(anchor)).toBeInTheDocument())
});

it('should call scrollToAnchor with the anchor as argument, after the anchor is changed by mouseover', () => {
  const {getByText} = render(<TouchScrollBar anchorList={mockAnchorList} scrollToAnchor={mockScrollToAnchor}/>);
  const event = new CustomEvent('mouseover', {bubbles: true});
  mockAnchorList.forEach((anchor, index) => {
    act(() => {
      getByText(anchor).dispatchEvent(event);
    });
    expect(mockScrollToAnchor.mock.calls.length).toBe(index + 1);
    expect(mockScrollToAnchor.mock.calls[index][0]).toBe(anchor);
    expect(mockScrollToAnchor.mock.calls[index][0]).not.toBe(`${anchor}-some-impossible-string`);
  });
});

it('should call scrollToAnchor with the anchor as argument, after the anchor is changed by touch move', () => {
  const {container, getByText} = render(<TouchScrollBar anchorList={mockAnchorList} scrollToAnchor={mockScrollToAnchor}/>);
  const rootElement = container.getElementsByTagName('div')[0];

  const liHeight = 100;
  rootElement.getBoundingClientRect = jest.fn(() => ({
    height: mockAnchorList.length * liHeight,
    width: 100,
    x: 0,
    y: 0
  }));

  const event = new CustomEvent('touchmove', {bubbles: true});
  mockAnchorList.forEach((anchor, index) => {
    act(() => {
      const element = getByText(anchor);
      event.changedTouches = [{
        clientX: 0,
        clientY: index * liHeight,
      }];
      element.dispatchEvent(event);
    });
    expect(mockScrollToAnchor.mock.calls.length).toBe(index + 1);
    expect(mockScrollToAnchor.mock.calls[index][0]).toBe(anchor);
    expect(mockScrollToAnchor.mock.calls[index][0]).not.toBe(`${anchor}-some-impossible-string`);
  });
});
