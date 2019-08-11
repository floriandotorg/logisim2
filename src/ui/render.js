import _ from 'lodash';
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { toBinaryString } from '../logic/util';
import './style.scss'

const Clock = ({ params: [ instance, name ] }) => {
  const [loading, setLoading] = useState(false);
  const [ticking, setTicking] = useState();
  const [period, setPeriod] = useState(200);

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

    <input type="range" min="10" max="500" value={period} onChange={updateInterval} id="clock"/>
    <label htmlFor="clock">{period}</label>
  </div>;
}

const PushButton = ({ params: [ instance, name ] }) => {
  const setLow = () => {
    setTimeout(() => {
      instance.setLow();
    });
  }

  const setHigh = () => {
    setTimeout(() => {
      instance.setHigh();
    });
  }

  return <div className="widget">
    <h2>{name}</h2>
    <button onMouseDown={setHigh} onMouseUp={setLow}>{name}</button>
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

const Display = ({value}) => {
  let a, b, c, d, e, f, g;

  switch(value) {
    case '0':
      a = b = c = d = e = f = true;
      break;
    case '1':
      b = c = true;
      break;
    case '2':
      a = b = d = e = g = true;
      break;
    case '3':
      a = b = c = d = g = true;
      break;
    case '4':
      b = c = f = g = true;
      break;
    case '5':
      a = c = d = f = g = true;
      break;
    case '6':
      a = c = d = e = f = g = true;
      break;
    case '7':
      a = b = c = true;
      break;
    case '8':
      a = b = c = d = e = f = g = true;
      break;
    case '9':
      a = b = c = d = f = g = true;
      break;
    case 'a':
      a = b = c = e = f = g = true;
      break;
    case 'b':
      c = d = e = f = g = true;
      break;
    case 'c':
      d = e = g = true;
      break;
    case 'd':
      b = c = d = e  = g = true;
      break;
    case 'e':
      a = d = e = f = g = true;
      break;
    case 'f':
      a = e = f = g = true;
      break;
  }

  return (<div className="display">
    <div className={`segment A ${a && 'on'}`} />
    <div className={`segment B ${b && 'on'}`} />
    <div className={`segment C ${c && 'on'}`} />
    <div className={`segment D ${d && 'on'}`} />
    <div className={`segment E ${e && 'on'}`} />
    <div className={`segment F ${f && 'on'}`} />
    <div className={`segment G ${g && 'on'}`} />
  </div>);
};

const SegDisplay  = ({ params: [ instance, name, width = 2, mode = 'hex' ] }) => {
  const [value, setValue] = useState(0n);

  instance.onValueChange(v => {
    setValue(v);
  });

  let values = [];

  if (mode === 'hex') {
    for (let n = width; n > 0 ; --n) {
      switch((value >> BigInt((n-1) * 4)) & 0xfn) {
        case 0x0n: values.push('0'); break;
        case 0x1n: values.push('1'); break;
        case 0x2n: values.push('2'); break;
        case 0x3n: values.push('3'); break;
        case 0x4n: values.push('4'); break;
        case 0x5n: values.push('5'); break;
        case 0x6n: values.push('6'); break;
        case 0x7n: values.push('7'); break;
        case 0x8n: values.push('8'); break;
        case 0x9n: values.push('9'); break;
        case 0xan: values.push('a'); break;
        case 0xbn: values.push('b'); break;
        case 0xcn: values.push('c'); break;
        case 0xdn: values.push('d'); break;
        case 0xen: values.push('e'); break;
        case 0xfn: values.push('f'); break;
      }
    }
  } else {
    values = _.take(_.padStart(value.toString(), width).split(''), width);
  }

  return <div className="widget ledarray">
    <h2>{name}</h2>
    <div>
      {values.map((v, n) => <Display key={n} value={v} />)}
    </div>
  </div>;
}

const LEDArray = ({ params: [ instance, name, color = 'red' ] }) => {
  const [value, setValue] = useState(0n);
  const [width, setWidth] = useState(0);

  instance.onValueChange((v, w) => {
    setValue(v);
    setWidth(w);
  });

  const leds = [];
  for (let n = 0n; n < width; ++n) {
    leds.unshift(value & (1n << n));
  }

  return <div className="widget ledarray">
    <h2>{name}</h2>
    <div className="leds">
      {leds.map((l, n) => <span key={n} className={`led ${l && 'on'}`} style={{background: color}} />)}
    </div>
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
  SegDisplay,
  PushButton,
}

export default (layout) => {
  const App = () => <div className="row">
    {layout.map((widgets, n) => <div key={n} className="col">
        {widgets.map(widget => {
          const Element = mapComponentToRenderer[widget[0].constructor.name];
          return <Element className="row" key={widget[1]} params={widget} />;
        })}
    </div>)}
  </div>

  ReactDOM.render(<App />, document.getElementById('app'));
}
