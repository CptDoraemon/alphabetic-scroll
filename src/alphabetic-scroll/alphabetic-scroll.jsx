import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {makeStyles} from "@material-ui/core/styles";

const HEADER_HEIGHT = 75;
// const FOOTER_HEIGHT = 115;

const search = (nums, target) => {
  let lo = 0, hi = nums.length - 1;
  while(lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (nums[mid] === target) {
      break;
    } else if (nums[mid] > target ) {
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  const mid = Math.floor((lo + hi) / 2);
  const index = target <= nums[mid] ? mid - 1 : mid;
  return Math.max(0, index);
};

const cap = (num, min, max) => {
  return Math.max(Math.min(num, max), min)
};

const useGetSectionPositions = (anchorList, anchorRefs) => {
  return useMemo(() => {
    const positions = [];
    anchorList.forEach(name => {
      positions.push(anchorRefs.current[name].getBoundingClientRect().top + window.scrollY - HEADER_HEIGHT)
    });
    return positions
  }, [anchorList, anchorRefs]);
};

const useGetListEndPosition = (listRef) => {
  return useMemo(() => {
    return listRef.current.getBoundingClientRect().bottom + window.scrollY;
  }, [listRef]);
};

const useBindScrollHandler = (setIndicatorTop, sectionPositions, listEndPosition, listLength) => {
  useEffect(() => {
    const scrollHandler = () => {
      const scrolled = window.scrollY;
      const currentSectionIndex = search(sectionPositions, scrolled);
      const currentSectionPositionStart = sectionPositions[currentSectionIndex];
      const currentSectionPositionEnd = currentSectionIndex < listLength - 1 ?
          sectionPositions[currentSectionIndex + 1] :
          listEndPosition;
      const percentageInCurrentSection = (scrolled - currentSectionPositionStart) / (currentSectionPositionEnd - currentSectionPositionStart);
      const cappedPercentageInCurrentSection = cap(percentageInCurrentSection, 0, 1);
      setIndicatorTop(100 / listLength * (currentSectionIndex + cappedPercentageInCurrentSection))
    };

    // scroll once to initialize indicator position
    scrollHandler();

    document.addEventListener('scroll', scrollHandler);
    return () => {
      document.removeEventListener('scroll', scrollHandler);
    }
  }, [listEndPosition, listLength, sectionPositions, setIndicatorTop])
};

const useBindTouchHandler = (rootRef, updateToClientYChange) => {
  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) {
      return
    }

    const handleTouchStart = (e) => {
      const clientY = e.changedTouches[0].clientY;
      updateToClientYChange(clientY);
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
      const clientY = e.changedTouches[0].clientY;
      updateToClientYChange(clientY);
    };

    rootEl.addEventListener('touchstart', handleTouchStart);
    rootEl.addEventListener('touchmove', handleTouchMove, {passive: false});
    return () => {
      rootEl.removeEventListener('touchstart', handleTouchStart);
      rootEl.removeEventListener('touchmove', handleTouchMove);
    }
  }, [rootRef, updateToClientYChange])
};

const useUpdateToClientYChange = (anchorListLength, rootRef, sectionPositions, listEndPosition) => {
  const isScrolledInCurrentCycleRef = useRef(false);

  const scrollTo = useCallback((sectionIndex, percentageInSection) => {
    const currentSectionPositionStart = sectionPositions[sectionIndex];
    const currentSectionPositionEnd = sectionIndex < anchorListLength - 1 ?
        sectionPositions[sectionIndex + 1] :
        listEndPosition;
    const destination = currentSectionPositionStart + percentageInSection * (currentSectionPositionEnd - currentSectionPositionStart);
    const cappedDestination = cap(destination, 0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo(0, cappedDestination);
  }, [anchorListLength, listEndPosition, sectionPositions]);

  const getTouchDetail = useCallback((clientY) => {
    if (!rootRef.current) {
      return
    }
    const rootRect = rootRef.current.getBoundingClientRect();
    const liHeight = rootRect.height / anchorListLength;
    const rawTouchedYInRect = clientY - rootRect.y;
    const touchedYInRect = cap(rawTouchedYInRect, 0, rootRect.height);

    const currentSectionIndex = cap(Math.floor(touchedYInRect / liHeight), 0, anchorListLength - 1);
    const currentSectionPercentage = touchedYInRect / liHeight - currentSectionIndex;
    const top = touchedYInRect / rootRect.height * 100;
    return {
      currentSectionIndex,
      currentSectionPercentage,
      indicatorTop: cap(top, 0, 100)
    }
  }, [anchorListLength, rootRef]);

  return useCallback((clientY) => {
    // iOS has jumping bug
    // The scroll bar has fixed position, which means whenever you scroll, its position relative to the entire document will be changed
    // it seems that on iOS, multiple window.scrollTo may be called within one frame, but fixed-positioned component won't be repositioned until a new frame is actually rendered
    // therefore the touch event will report a wrong clientY that is outside of viewport.
    // make sure it only scroll once within one frame
    // why 2 requestAnimationFrame? requestAnimationFrame is called right before rendering,
    // so if you open the lock right there the fixed-positioned component hasn't been repositioned yet, wrong clientY still maybe reported.
    if (isScrolledInCurrentCycleRef.current) {
      return
    }
    isScrolledInCurrentCycleRef.current = true;
    const touchDetail = getTouchDetail(clientY);
    scrollTo(touchDetail.currentSectionIndex, touchDetail.currentSectionPercentage);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isScrolledInCurrentCycleRef.current = false;
      })
    })
  }, [getTouchDetail, scrollTo])
};

const useInlineStyles = (listLength) => {
  return useMemo(() => {
    const containerHeight = 430;
    const listItemHeight = containerHeight / listLength;
    const fontSize = 12;
    return {
      li: {
        height: `${listItemHeight}px`,
        fontSize: `${fontSize}px`
      },
      container: {
        height: `${containerHeight}px`,
      }
    }
  }, [listLength]);
};

const useStyles = makeStyles((theme) => {
  const rootWidth = 41 + 12;
  const textWidth = 12;
  const indicatorWidth = 30;
  const textMarginLeft = rootWidth - textWidth - indicatorWidth;
  const indicatorHeight = 4;
  const triangleSize = indicatorHeight / 2;

  return {
    root: {
      position: 'fixed',
      left: 0,
      top: 'calc(50% - 430px/2 - 19.5px)',
      width: rootWidth,
      zIndex: theme.zIndex.appBar,
    },
    relativeWrapper: {
      position: 'relative',
      width: '100%',
      height: '100%',
      '& ul': {
        width: '100%',
        listStyleType: 'none',
        margin: 0,
        padding: 0,
      },
      '& li': {
        width: '100%',
        textTransform: 'uppercase',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        position: 'relative'
      },
      '& span': {
        marginLeft: textMarginLeft,
        display: 'block',
        width: textWidth,
        textAlign: 'center',
        color: '#252525'
      }
    },
    indicator: {
      position: 'absolute',
      width: indicatorWidth,
      height: indicatorHeight,
      backgroundColor: theme.palette.primary.main,
      left: 0,
      transform: 'translateY(-50%)',
      filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2))',
      '&:after': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: indicatorWidth,
        fontSize: 0,
        lineHeight: '0%',
        width: 0,
        borderTop: `${triangleSize}px solid rgba(0,0,0,0)`,
        borderBottom: `${triangleSize}px solid rgba(0,0,0,0)`,
        borderLeft: `${triangleSize}px solid ${theme.palette.primary.main}`,
        borderRight: 'none',
      }
    }
  }
});

/**
 * Workflow:
 * touch/hover -> scroll to corresponding section's position in document -> update indicator position state
 * scroll -> update indicator position state
 */
/**
 * @type {React.FC<TouchScrollBarProps>}
 */
const TouchScrollBarInner = ({anchorList, anchorRefs, listRef}) => {
  const classes = useStyles();
  const styles = useInlineStyles(anchorList.length);
  const rootRef = useRef(null);
  const anchorListLength = anchorList.length;
  const sectionPositions = useGetSectionPositions(anchorList, anchorRefs);
  const listEndPosition = useGetListEndPosition(listRef);

  const [indicatorTop, _setIndicatorTop] = useState(0); // [0, 100]
  const setIndicatorTop = useCallback((num) => {
    // change the num here if you wanna avoid excessive state update (round it or toFixed).
    _setIndicatorTop(num.toFixed(3))
  }, []);

  const updateToClientYChange = useUpdateToClientYChange(anchorListLength, rootRef, sectionPositions, listEndPosition);
  useBindScrollHandler(setIndicatorTop, sectionPositions, listEndPosition, anchorListLength);
  useBindTouchHandler(rootRef, updateToClientYChange);

  const mouseMoveHandler = useCallback((e) => {
    const clientY = e.clientY;
    updateToClientYChange(clientY)
  }, [updateToClientYChange]);

  return (
      <div
          ref={rootRef}
          className={classes.root}
          style={styles.container}
          onMouseEnter={mouseMoveHandler}
          onMouseMove={mouseMoveHandler}
      >
        <div className={classes.relativeWrapper}>
          <div
              className={classes.indicator}
              style={{top: `${indicatorTop}%`}}
          > </div>
          <ul>
            {
              anchorList.map(name => (
                  <li
                      key={name}
                      style={styles.li}
                  >
                    <span>{name}</span>
                  </li>
              ))
            }
          </ul>
        </div>
      </div>
  )
};

/**
 * @typedef {String[]} AnchorList
 * An array of the anchors to be used to render list text, eg: ['a', 'b', 'c', 'z'].
 * It's supposed to be sorted according to their position in the document
 */
/**
 * @typedef {React.RefObject<Object<string, any>>} AnchorRefs
 * A ref object, it's current property is an object, of which key is the name of the anchor, value is the element.
 * Needed to get the positions of the start position of each section.
 *
 * In the parent component, set up like this:
 * const anchorRefs = useRef({});
 * return (
 *    nameArray.map(name => <div ref={node => anchorRefs.current[name] = node}></div>)
 * )
 */
/**
 * @typedef {React.RefObject<HTMLElement>} ListRef
 * The ref of the root list component. This ref is used to calculate the height of last section
 * Need to know the height of each section, I can get them from AnchorRefs except the last section.
 */
/**
 * @typedef {Object<string, any>} TouchScrollBarProps
 * @property {AnchorList} anchorList
 * @property {AnchorRefs} anchorRefs
 * @property {ListRef} listRef
 */
/**
 * A helper component, used to make sure the lists are mounted before scrollbar so that ref object is populated.
 * @type {React.FC<TouchScrollBarProps>} TouchScrollBar
 */
const TouchScrollBar = ({anchorList, anchorRefs, listRef}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (anchorList && anchorList.length > 0) {
      setMounted(true)
    }
  }, [anchorList]);

  if (!mounted) {
    return <></>
  } else {
    return <TouchScrollBarInner anchorList={anchorList} anchorRefs={anchorRefs} listRef={listRef}/>
  }
};

export default TouchScrollBar
