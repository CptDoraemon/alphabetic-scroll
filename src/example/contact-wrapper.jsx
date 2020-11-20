import React, {useMemo, useRef} from "react";
import './contact-wrapper.css';
import TouchScrollBar from "../alphabetic-scroll/alphabetic-scroll";

const alphabet = 'abcdefghijklmnopqrstuvwxyz';
const getRandom = (max) => Math.floor(Math.random() * (max + 1));
const mockData = (() => {
  const names = [];
  const nameLengthMax = 5;

  for (let i=0; i<26; i++) {
    const firstLetter = alphabet[i];
    const namesStartedWithThisLetter = [];
    const nameCount = getRandom(10);
    for (let j=0; j<nameCount; j++) {
      let name = firstLetter;
      for (let k=0; k<nameLengthMax; k++) {
        const letter = alphabet[getRandom(26)];
        name += letter
      }
      namesStartedWithThisLetter.push(name)
    }

    if (namesStartedWithThisLetter.length > 0) {
      namesStartedWithThisLetter.sort((a, b) => a.localeCompare(b));
      names.push(namesStartedWithThisLetter);
    }
  }

  return names
})();

const ContactWrapper = () => {

  const listRef = useRef(null);

  const categories = useMemo(() => {
    return mockData.map(names => names[0][0])
  }, []);
  const anchorRefs = useRef({});

  const list = useMemo(() => {
    return <>
      {
        mockData.map((names, i) => (
          <div key={categories[i]} ref={node => anchorRefs.current[categories[i]] = node} id={categories[i]}>
            <div className={'contact-wrapper-letter-title'}>{categories[i]}</div>
            <ul>
              {
                names.map((name, j) => (
                  <li key={j}>
                    {name}
                  </li>
                ))
              }
            </ul>
          </div>
        ))
      }
    </>
  }, [categories]);

  return (
    <>
      <div className={'contact-wrapper-root'} ref={listRef}>
        {list}
      </div>
      <TouchScrollBar anchorList={categories} anchorRefs={anchorRefs} listRef={listRef}/>
    </>
  )
};

export default ContactWrapper
