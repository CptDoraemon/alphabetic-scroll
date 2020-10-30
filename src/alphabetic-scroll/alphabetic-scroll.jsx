import React, {useEffect, useMemo, useRef, useState} from "react";
import {makeStyles} from "@material-ui/core/styles";

const useAnchor = () => {
  const [anchor, setAnchor] = useState(null);

  /**
   * @typedef {React.RefObject<boolean>} IsScrolledByJsRef
   * ScrolledByJs means the user used this component to scroll, and the scroll action is completed by window.scrollTo
   * useScrollAfterAnchorChange can be skipped if indeed scrolled by js.
   */
  const isScrolledByJsRef = useRef(false);
  return {anchor, setAnchor, isScrolledByJsRef}
};

/**
 * @param {AnchorList} anchorList
 * @param {AnchorRefs} anchorRefs
 * @param {React.Dispatch<React.SetStateAction<string>>} setAnchor
 * @param {IsScrolledByJsRef} isScrolledByJsRef
 */
const useBindAnchorToScroll = (anchorList, anchorRefs, setAnchor, isScrolledByJsRef) => {
  const anchorPosition = useMemo(() => {
    const positions = [];
    anchorList.forEach(name => {
      positions.push(anchorRefs[name].getBoundingClientRect().top + window.scrollY)
    });
    return positions
  }, [anchorList, anchorRefs]);

  useEffect(() => {
    const search = (nums, target) => {
      let lo = 0, hi = nums.length;
      while (lo < hi) {
        const mid = Math.floor((lo+hi)/2);
        if (nums[mid] === target) {
          return mid;
        }
        if (nums[mid] <= target) {
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      return hi === -1 ? 0 : hi;
    };

    const scrollHandler = () => {
      if (isScrolledByJsRef.current) {
        return
      }
      const anchorIndex = search(anchorPosition, window.scrollY);
      setAnchor(anchorList[anchorIndex])
    };

    document.addEventListener('scroll', scrollHandler);
    // set the initial anchor by running scrollHandler once
    scrollHandler();

    return () => {
      document.removeEventListener('scroll', scrollHandler)
    }
  }, [anchorList, anchorPosition, setAnchor, isScrolledByJsRef])
};

/**
 * @param {React.RefObject} rootRef The ref of the scrollbar root element
 * @param {AnchorList} anchorList
 * @param {React.Dispatch<React.SetStateAction<string>>} setAnchor
 * @param {IsScrolledByJsRef} isScrolledByJsRef
 */
const useBindAnchorToTouch = (rootRef, anchorList, setAnchor, isScrolledByJsRef) => {
  useEffect(() => {
    if (!rootRef.current) {
      return;
    }
    const rootEl = rootRef.current;

    // return the anchor that was touched
    const getAnchor = (clientX, clientY) => {
      const rootRect = rootEl.getBoundingClientRect();
      const liHeight = rootRect.height / anchorList.length;
      const index = Math.floor((clientY - rootRect.y) / liHeight);
      const cappedIndex = Math.min(Math.max(0, index), anchorList.length - 1);
      return anchorList[cappedIndex]
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
      const clientX = e.changedTouches[0].clientX;
      const clientY = e.changedTouches[0].clientY;
      const anchor = getAnchor(clientX, clientY);
      setAnchor(prevAnchor => {
        if (prevAnchor !== anchor) {
          isScrolledByJsRef.current = true;
        }
        return anchor
      });
    };

    rootEl.addEventListener('touchstart', handleTouchMove, {passive: false});
    rootEl.addEventListener('touchmove', handleTouchMove, {passive: false});
    return () => {
      rootEl.removeEventListener('touchstart', handleTouchMove);
      rootEl.removeEventListener('touchmove', handleTouchMove);
    }
  }, [anchorList, rootRef, setAnchor, isScrolledByJsRef]);
};

/**
 * @param {String} anchor
 * @param {AnchorRefs} anchorRefs
 * @param {IsScrolledByJsRef} isScrolledByJsRef
 */
const useScrollAfterAnchorChange = (anchor, anchorRefs, isScrolledByJsRef) => {
  const previousAnchorRef = useRef(anchor);

  useEffect(() => {
    if (previousAnchorRef.current !== anchor && isScrolledByJsRef.current) {
      window.scrollTo(0, anchorRefs[anchor].getBoundingClientRect().top + window.scrollY);
    }
    isScrolledByJsRef.current = false;
    return () => {
      previousAnchorRef.current = anchor
    }
  });
};

const useInlineStyles = (listLength) => {
  return useMemo(() => {
    const maxContainerHeight = window.innerHeight * 0.8;
    const maxHeight = 20;
    const minHeight = 10;
    const rawHeight = maxContainerHeight / listLength;
    const height = Math.max(Math.min(rawHeight, maxHeight), minHeight);
    const containerHeight = height * listLength;
    const fontSize = Math.min(14, height);
    return {
      li: {
        height: `${height}px`,
        fontSize: `${fontSize}px`
      },
      container: {
        height: `${containerHeight}px`,
      },
      indicator: {
        height: `${Math.floor(fontSize / 5)}px`
      }
    }
  }, [listLength]);
};

const useStyles = makeStyles((theme) => {
  const rootWidth = 60;
  const textWidth = 20;
  const paddingLeft = 10;
  const indicatorWidth = rootWidth - textWidth - paddingLeft;

  return {
    root: {
      position: 'fixed',
      left: 0,
      top: '50%',
      width: rootWidth,
      transform: 'translateY(-50%)',
      '& ul': {
        width: '100%',
        listStyleType: 'none',
        margin: 0,
        padding: 0,
      },
      '& li': {
        width: '100%',
        textTransform: 'uppercase',
        color: theme.palette.primary.main,
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        position: 'relative'
      },
      '& span': {
        display: 'block',
        width: 20,
        textAlign: 'center'
      }
    },
    indicator: {
      position: 'absolute',
      width: indicatorWidth,
      backgroundColor: theme.palette.primary.main,
      right: textWidth,
      top: '50%',
      transform: 'translateY(-50%)',
    }
  }
});

/**
 * @type {React.FC<TouchScrollBarProps>}
 */
const TouchScrollBarInner = ({anchorList, anchorRefs: _anchorRefs}) => {
  const anchorRefs = _anchorRefs.current;
  const classes = useStyles();
  const styles = useInlineStyles(anchorList.length);

  const rootRef = useRef(null);
  const {anchor, setAnchor, isScrolledByJsRef} = useAnchor();
  useBindAnchorToScroll(anchorList, anchorRefs, setAnchor, isScrolledByJsRef);
  useBindAnchorToTouch(rootRef, anchorList, setAnchor, isScrolledByJsRef);
  useScrollAfterAnchorChange(anchor, anchorRefs, isScrolledByJsRef);

  const getMouseOverHandler = (name) => {
    return () => {
      setAnchor(prevAnchor => {
        if (prevAnchor !== name) {
          isScrolledByJsRef.current = true;
        }
        return name
      });
    }
  };

  return (
    <div
      ref={rootRef}
      className={classes.root}
      style={styles.container}
    >
      <ul>
        {
          anchorList.map(name => (
            <li
              onMouseOver={getMouseOverHandler(name)}
              key={name}
              style={styles.li}
            >
              <span>{name}</span>
              { anchor === name && <div className={classes.indicator} style={styles.indicator}/> }
            </li>
          ))
        }
      </ul>
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
 * in the parent component, set up like this:
 * const anchorRefs = useRef({});
 * return (
 *    nameArray.map(name => <div ref={node => anchorRefs.current[name] = node}></div>)
 * )
 */
/**
 * @typedef {Object<string, any>} TouchScrollBarProps
 * @property {AnchorList} anchorList
 */
/**
 * A helper component, used to make sure the lists are mounted before scrollbar so that ref object is populated.
 * @type {React.FC<TouchScrollBarProps>}
 */
const TouchScrollBar = (props) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true)
  }, []);

  if (!mounted) {
    return <></>
  } else {
    return <TouchScrollBarInner {...props}/>
  }
};

export default TouchScrollBar
