import { useId } from "react";
export default function MapArtwork({ showGrid }: { showGrid: boolean }) {
  const id = useId();
  return (
    <g>
      <defs>
        <pattern id={id} width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M40 0H0V40"
            fill="none"
            stroke="#779ea1"
            strokeOpacity=".24"
          />
        </pattern>
      </defs>
      <rect width="400" height="400" rx="3" fill="#f2f3df" />
      <path
        d="M310 0C260 90 360 110 320 200S285 315 355 400H400V0"
        fill="#a5dce6"
      />
      <path
        d="M323 0C273 90 373 110 333 200S298 315 368 400"
        fill="none"
        stroke="#d1edf0"
        strokeWidth="3"
      />
      <g fill="#c8dfbb">
        <rect x="22" y="20" width="96" height="90" rx="14" />
        <rect x="24" y="262" width="98" height="112" rx="14" />
        <rect x="167" y="159" width="103" height="74" rx="12" />
      </g>
      <g stroke="#d5d9ce" strokeWidth="27">
        <path d="M0 135H400M0 247H400M143 0V400" />
      </g>
      <g stroke="#fffdf5" strokeWidth="21">
        <path d="M0 135H400M0 247H400M143 0V400" />
      </g>
      <g stroke="#c8cabb" strokeWidth="1.5" strokeDasharray="7 7">
        <path d="M0 135H400M0 247H400M143 0V400" />
      </g>
      <g fill="#83b891" stroke="#619b74" strokeWidth="2">
        {[
          [42, 42],
          [93, 46],
          [55, 85],
          [93, 310],
          [50, 340],
          [205, 183],
          [240, 207],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <path d={`M${x} ${y}v15`} />
            <circle cx={x} cy={y} r="12" />
          </g>
        ))}
      </g>
      <g stroke="#b98963" strokeWidth="2">
        <rect x="183" y="38" width="79" height="65" rx="5" fill="#ead1a4" />
        <path d="M174 43l48-26 49 26z" fill="#cf9c75" />
        <path
          d="M199 52v36m23-36v36m23-36v36"
          stroke="#fff1d5"
          strokeWidth="7"
        />
      </g>
      <g>
        <rect x="35" y="179" width="67" height="42" rx="4" fill="#e0a295" />
        <path d="M27 181l42-27 42 27z" fill="#bf746d" />
        <rect x="61" y="198" width="16" height="23" fill="#ffead7" />
        <rect x="184" y="284" width="78" height="64" rx="6" fill="#a9b4db" />
        <path d="M179 283h88v13h-88" fill="#7b8dbd" />
        <path
          d="M197 308h13m18 0h13m-44 18h13m18 0h13"
          stroke="#edf1ff"
          strokeWidth="8"
        />
      </g>
      <g
        fontFamily="sans-serif"
        fontSize="10"
        fontWeight="600"
        fill="#526969"
        textAnchor="middle"
      >
        <text x="70" y="105">
          GARDEN
        </text>
        <text x="222" y="116">
          MUSEUM
        </text>
        <text x="70" y="235">
          HOME
        </text>
        <text x="223" y="365">
          STATION
        </text>
      </g>
      {showGrid && (
        <rect
          width="400"
          height="400"
          fill={`url(#${id})`}
          pointerEvents="none"
        />
      )}
    </g>
  );
}
