import React, {useEffect, useMemo, useRef, useState} from "react";
import {makeStyles} from "@material-ui/core/styles";

const useAnchor = () => {
  /**
   * @typedef {{
   *   source: 'js' | 'user',
   *   name: String
   * }} AnchorState
   * If source is 'js', it means the anchor state was set by touching or hovering, therefore scroll action is needed after state update,
   * if source is 'user', it means the anchor state was set by actually scrolling, therefore scroll action is NOT needed after state update,
   */
  const [anchor, setAnchor] = useState({
    name: '',
    source: 'js'
  });
  return {anchor, setAnchor}
};

/**
 * @param {AnchorList} anchorList
 * @param {AnchorRefs} anchorRefs
 * @param {React.Dispatch<React.SetStateAction<string>>} setAnchor
 * @param {React.RefObject<boolean>} isTouchingRef
 */
const useBindAnchorToScroll = (anchorList, anchorRefs, setAnchor, isTouchingRef) => {
  const anchorPosition = useMemo(() => {
    const positions = [];
    anchorList.forEach(name => {
      positions.push(anchorRefs.current[name].getBoundingClientRect().top + window.scrollY)
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
      if (isTouchingRef.current) {
        // see comments @isTouchingRef for detail
        return
      }
      const anchorIndex = search(anchorPosition, window.scrollY);
      const newAnchorName = anchorList[anchorIndex];
      setAnchor(prevAnchor => {
        if (prevAnchor.name !== newAnchorName) {
          return {
            source: 'user',
            name: newAnchorName
          }
        } else {
          return prevAnchor
        }
      })
    };

    document.addEventListener('scroll', scrollHandler);
    // set the initial anchor by running scrollHandler once
    scrollHandler();

    return () => {
      document.removeEventListener('scroll', scrollHandler)
    }
  }, [anchorList, anchorPosition, setAnchor, isTouchingRef])
};

/**
 * @param {React.RefObject} rootRef The ref of the scrollbar root element
 * @param {AnchorList} anchorList
 * @param {React.Dispatch<React.SetStateAction<string>>} setAnchor
 * @param {React.RefObject<boolean>} isTouchingRef
 */
const useBindAnchorToTouch = (rootRef, anchorList, setAnchor, isTouchingRef) => {
  const lastTouched = useRef(0);

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
      isTouchingRef.current = true;

      // throttling
      // otherwise it jumps on ios
      const now = Date.now();
      if (now - lastTouched.current < 50) {
        return
      }
      lastTouched.current = now;

      const clientX = e.changedTouches[0].clientX;
      const clientY = e.changedTouches[0].clientY;
      const newAnchorName = getAnchor(clientX, clientY);
      setAnchor(prevAnchor => {
        if (prevAnchor.name !== newAnchorName) {
          return {
            source: 'js',
            name: newAnchorName
          }
        } else {
          return prevAnchor
        }
      });
    };

    const handleTouchEnd = () => {
      isTouchingRef.current = false;
    };

    rootEl.addEventListener('touchstart', handleTouchMove, {passive: false});
    rootEl.addEventListener('touchmove', handleTouchMove, {passive: false});
    rootEl.addEventListener('touchend', handleTouchEnd);
    return () => {
      rootEl.removeEventListener('touchstart', handleTouchMove);
      rootEl.removeEventListener('touchmove', handleTouchMove);
      rootEl.removeEventListener('touchend', handleTouchEnd);
    }
  }, [anchorList, rootRef, setAnchor, isTouchingRef]);
};

/**
 * @param {AnchorState} anchor
 * @param {AnchorRefs} anchorRefs
 */
const useScrollAfterAnchorChange = (anchor, anchorRefs) => {
  const previousAnchorRef = useRef(anchor);

  useEffect(() => {
    if (previousAnchorRef.current.name !== anchor.name && anchor.source === 'js' && anchorRefs.current) {
      window.scrollTo(0, anchorRefs.current[anchor.name].getBoundingClientRect().top + window.scrollY);
    }
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
 * Workflow:
 * touch/hover -> update anchor state -> sync scroll position to anchor state
 * scroll -> sync anchor state to scroll position
 */
/**
 * @type {React.FC<TouchScrollBarProps>}
 */
const TouchScrollBarInner = ({anchorList, anchorRefs}) => {
  const classes = useStyles();
  const styles = useInlineStyles(anchorList.length);

  // needed to solve ios bottom anchor jumping issue
  // ios has elastic scrolling, you can scroll out of the bottom and it will automatically scroll back to the bottom
  // that bounce back action will trigger scroll event listener, do not update anchor state for that action.
  const isTouchingRef = useRef(false);

  const rootRef = useRef(null);
  const {anchor, setAnchor} = useAnchor();
  useBindAnchorToScroll(anchorList, anchorRefs, setAnchor, isTouchingRef);
  useBindAnchorToTouch(rootRef, anchorList, setAnchor, isTouchingRef);
  useScrollAfterAnchorChange(anchor, anchorRefs);

  const getMouseOverHandler = (newAnchorName) => {
    return () => {
      setAnchor(prevAnchor => {
        if (prevAnchor.name !== newAnchorName) {
          return {
            source: 'js',
            name: newAnchorName
          }
        } else {
          return prevAnchor
        }
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
              { anchor.name === name && <div className={classes.indicator} style={styles.indicator}/> }
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
 * @property {AnchorRefs} anchorRefs
 */
/**
 * A helper component, used to make sure the lists are mounted before scrollbar so that ref object is populated.
 * @type {React.FC<TouchScrollBarProps>} TouchScrollBar
 */
const TouchScrollBar = ({anchorList, anchorRefs}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true)
  }, []);

  if (!mounted) {
    return <></>
  } else {
    return <TouchScrollBarInner anchorList={anchorList} anchorRefs={anchorRefs}/>
  }
};

export default TouchScrollBar
