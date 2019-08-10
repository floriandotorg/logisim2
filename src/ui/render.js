import _ from 'lodash';
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { toBinaryString } from '../logic/util';

const Clock = ({ params: [ instance, name ] }) => {
  const [loading, setLoading] = useState(false);
  const [ticking, setTicking] = useState();
  const [period, setPeriod] = useState(1000);

  const tick = () => {
    setLoading(true);

    setTimeout(() => {
      instance.tick();
      setLoading(false);
    });
  }

  const setLow = () => {
    setLoading(true);

    setTimeout(() => {
      instance.setLow();
      setLoading(false);
    });
  }

  const setHigh = () => {
    setLoading(true);

    setTimeout(() => {
      instance.setHigh();
    });
  }

  const go = () => {
    setTicking(setInterval(tick, period));
  }

  const pause = () => {
    setTicking(clearInterval(ticking));
  }

  const updateInterval = event => {
    if (ticking) {
      pause();
    }

    setPeriod(event.target.value);

    if (ticking) {
      go();
    }
  }

  return <div className="widget">
    <h2>{name}</h2>
    <button onMouseDown={setHigh} onMouseUp={setLow} disabled={ticking}>Tick</button>

    {!ticking ? <button onClick={go} disabled={loading}>Go</button> : <button onClick={pause} disabled={loading}>Pause</button>}

    <input type="range" min="100" max="2000" value={period} onChange={updateInterval} id="clock"/>
    <label htmlFor="clock">{period}</label>
  </div>;
}

const DIPSwitch = ({ params: [ instance, name ] }) => {
  const [value, setValue] = useState(0n);

  const onChange = n => event => {
    const newValue = event.target.checked ? value | (1n << BigInt(n)) : value & ~ (1n << BigInt(n));
    instance.set(newValue);
    setValue(newValue);
  }

  return <div className="widget">
    <h2>{name}</h2>
    {_.rangeRight(instance.width()).map(n => <input key={n} type="checkbox" onChange={onChange(n)} checked={value & (1n << BigInt(n))} />)}
  </div>;
}

const LEDArray = ({ params: [ instance, name ] }) => {
  const [value, setValue] = useState(0n);
  const [width, setWidth] = useState(0);

  instance.onValueChange((v, w) => {
    setValue(v);
    setWidth(w);
  });

  return <div className="widget">
    <h2>{name}</h2>
    <p>{toBinaryString(value, width)}</p>
  </div>;
}

const Ram = ({ params: [ instance, name ] }) => {
  const [content, setContent] = useState([]);
  const [output, setOutput] = useState(0n);

  instance.onValueChange((content, output) => {
    setContent(content.map(v => `0x${v.toString(16)}`).join(' '));
    setOutput(output);
  });

  const onChange = event => {
    setContent(event.target.value);
  }

  const save = () => {
    instance.setContent(content.split(' ').map(v => BigInt(v)));
  }

  return <div className="widget">
    <h2>{name}</h2>
    <textarea onChange={onChange} value={content} />
    <button onClick={save}>Save</button>
    <p>{`0x${output.toString(16)}`}</p>
  </div>;
}

const mapComponentToRenderer = {
  LEDArray,
  'Register': LEDArray,
  DIPSwitch,
  Clock,
  Ram,
}

export default (layout) => {
  const App = () => <div>
    {layout.map(widget => {
      const Element = mapComponentToRenderer[widget[0].constructor.name];
      return <Element className="row" key={widget[1]} params={widget} />;
    })}
  </div>

  ReactDOM.render(<App />, document.getElementById('app'));
}
