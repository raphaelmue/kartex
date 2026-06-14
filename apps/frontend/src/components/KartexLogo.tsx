interface KartexLogoProps {
  className?: string
}

export function KartexLogo({ className }: KartexLogoProps) {
  return (
    <svg
      viewBox="0 0 1000 1000"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      style={{ fillRule: 'evenodd', clipRule: 'evenodd' }}
    >
      <path
        d="M430.661,242.545L467.669,46.454C472.376,21.511 496.449,5.082 521.391,9.79L949.276,90.544C974.219,95.252 990.647,119.324 985.94,144.267L862.524,798.195C857.817,823.138 833.745,839.566 808.802,834.859L778.297,829.102L778.297,288.537C778.297,263.153 757.689,242.545 732.306,242.545L430.661,242.545Z"
        fill="rgb(57,50,161)"
      />
      <path
        d="M250.876,903.951L154.641,916.971C129.487,920.375 106.302,902.716 102.899,877.562L13.675,218.098C10.272,192.944 27.931,169.759 53.085,166.356L484.592,107.974C509.746,104.571 532.93,122.23 536.334,147.384L549.209,242.545L296.867,242.545C271.484,242.545 250.876,263.153 250.876,288.537L250.876,903.951Z"
        fill="rgb(79,70,229)"
      />
      <g transform="matrix(13.404397,0,0,13.404397,-646.126468,-10223.267687)">
        <text
          x="72.529"
          y="825.023"
          className="fill-[rgb(52,52,52)] dark:fill-white"
          style={{ fontFamily: "'Lato-Regular', 'Lato', sans-serif", fontSize: '50px' }}
        >
          k
        </text>
      </g>
    </svg>
  )
}
