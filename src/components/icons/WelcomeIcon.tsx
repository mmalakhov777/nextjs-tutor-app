import React from 'react';

interface WelcomeIconProps {
  className?: string;
  width?: number;
  height?: number;
}

export function WelcomeIcon({ className, width = 81, height = 80 }: WelcomeIconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={width} 
      height={height} 
      viewBox="0 0 81 80" 
      fill="none"
      className={className}
    >
      <path d="M76.7271 21.5563V35.8469C76.7271 38.2336 75.7399 40.3992 74.2078 41.9756C72.6166 43.5373 70.4804 44.5096 68.079 44.5096L64.9263 50.1964C64.6021 50.8004 63.7771 50.8004 63.453 50.1964L60.2855 44.5096H56.8675V49.3861C56.8675 55.1023 52.1973 59.7431 46.4958 59.7431H28.36L24.5738 66.5643C24.1907 67.2861 23.2037 67.2861 22.8058 66.5643L19.0343 59.7431C16.1614 59.7431 13.598 58.5792 11.6975 56.7229C9.85595 54.8371 8.69202 52.2442 8.69202 49.3861V32.2816C8.69202 26.5653 13.3328 21.9246 19.0343 21.9246H32.7798V21.5563C32.7798 16.783 36.6692 12.8936 41.4426 12.8936H68.079C72.8377 12.8936 76.7271 16.783 76.7271 21.5563Z" fill="black"/>
      <path d="M23.6958 67.861C23.056 67.861 22.462 67.5057 22.145 66.9294L18.5852 60.4892C15.814 60.3772 13.196 59.2421 11.1692 57.2625C9.08048 55.1236 7.93661 52.3303 7.93661 49.3866V32.2817C7.93661 26.1555 12.9145 21.1702 19.0348 21.1702H32.033C32.2364 16.1555 36.3785 12.1387 41.4419 12.1387H68.0796C73.2639 12.1387 77.4811 16.3633 77.4811 21.5564V35.8474C77.4811 38.3253 76.5112 40.6897 74.7482 42.5028C73.0398 44.1802 70.8493 45.1443 68.5307 45.2548L65.587 50.5629C65.0327 51.5947 63.3508 51.6021 62.7877 50.5555L59.8411 45.2651H57.6226V49.3866C57.6226 55.5128 52.6315 60.498 46.4965 60.498H28.8034L25.2347 66.9308C24.9295 67.5042 24.3576 67.8551 23.709 67.861C23.7046 67.861 23.7002 67.861 23.6958 67.861ZM19.0348 22.6797C13.7473 22.6797 9.44605 26.9868 9.44605 32.2817V49.3866C9.44605 51.9352 10.4366 54.3527 12.2364 56.1953C14.0761 57.9921 16.495 58.9886 19.0348 58.9886C19.309 58.9886 19.5625 59.1375 19.6952 59.3778L23.4658 66.1997C23.538 66.3309 23.6397 66.3515 23.6958 66.3515C23.7577 66.35 23.8461 66.3265 23.908 66.2115L27.6993 59.3778C27.8334 59.1375 28.0855 58.9886 28.3597 58.9886H46.4965C51.7986 58.9886 56.1132 54.6814 56.1132 49.3866V44.5104C56.1132 44.0933 56.4508 43.7557 56.8679 43.7557H60.2848C60.559 43.7557 60.811 43.9046 60.9437 44.1434L64.1114 49.8303C64.1114 49.8303 64.2176 49.8318 64.2529 49.8318H64.2662L67.4192 44.1449C67.5519 43.9046 67.8054 43.7557 68.0796 43.7557C70.1669 43.7557 72.1554 42.9332 73.6781 41.4385C75.1536 39.9202 75.9717 37.9302 75.9717 35.8474V21.5564C75.9717 17.1962 72.431 13.6481 68.0796 13.6481H41.4419C37.0817 13.6481 33.5351 17.1962 33.5351 21.5564V21.9249C33.5351 22.3421 33.1975 22.6797 32.7804 22.6797H19.0348Z" fill="black"/>
      <path d="M28.3584 21.5585V35.8503C28.3584 40.6285 32.2559 44.5074 37.0155 44.5074H55.8664L59.033 50.2039C59.3517 50.8034 60.1763 50.8034 60.5134 50.2039L63.6614 44.5074C66.0599 44.5074 68.1961 43.5331 69.7888 41.9777C71.3255 40.4037 72.2999 38.2301 72.2999 35.8503V21.5585C72.2999 16.7801 68.421 12.9014 63.6614 12.9014H37.0155C32.2559 12.9014 28.3584 16.7801 28.3584 21.5585Z" fill="white"/>
      <path d="M59.7659 51.408C59.76 51.408 59.7527 51.408 59.7468 51.408C59.1616 51.4006 58.6456 51.0837 58.367 50.5575L55.4233 45.2626H37.0153C31.8252 45.2626 27.6035 41.0409 27.6035 35.8508V21.5583C27.6035 16.3682 31.8252 12.1465 37.0153 12.1465H63.6618C68.8417 12.1465 73.0545 16.3682 73.0545 21.5583V35.8508C73.0545 38.3405 72.0876 40.7049 70.329 42.5062C68.6147 44.1792 66.4257 45.1418 64.1129 45.2523L61.1736 50.5692C60.8803 51.0896 60.3438 51.408 59.7659 51.408ZM37.0153 13.6559C32.658 13.6559 29.1129 17.201 29.1129 21.5583V35.8508C29.1129 40.2081 32.658 43.7532 37.0153 43.7532H55.867C56.1412 43.7532 56.3933 43.9021 56.5274 44.1409L59.6937 49.8366L60.5133 50.2037L59.8529 49.8381L63.0015 44.1424C63.1341 43.9021 63.3877 43.7532 63.6618 43.7532C65.7432 43.7532 67.7332 42.9307 69.2618 41.4389C70.73 39.9339 71.5451 37.9454 71.5451 35.8508V21.5583C71.5451 17.201 68.0088 13.6559 63.6618 13.6559H37.0153Z" fill="black"/>
      <path d="M52.4425 32.2854V49.3894C52.4425 55.1079 47.7781 59.75 42.0819 59.75H23.9415L20.1517 66.5674C19.7704 67.2849 18.7835 67.2849 18.38 66.5674L14.6126 59.75C11.7421 59.75 9.18557 58.5839 7.27946 56.7226C5.44041 54.8388 4.27424 52.2375 4.27424 49.3894V32.2854C4.27424 26.5668 8.91648 21.9248 14.6126 21.9248H42.0819C47.7781 21.9248 52.4425 26.5668 52.4425 32.2854Z" fill="#70D6FF"/>
      <path d="M19.2751 67.8607C18.6368 67.8607 18.0442 67.5084 17.7229 66.9379L14.163 60.4963C11.3992 60.3843 8.78272 59.2463 6.75147 57.2622C4.66274 55.1219 3.51887 52.33 3.51887 49.3893V32.2858C3.51887 26.1567 8.49528 21.1699 14.6126 21.1699H42.0817C48.2108 21.1699 53.1975 26.1567 53.1975 32.2858V49.3893C53.1975 55.5184 48.2108 60.5051 42.0817 60.5051H24.3856L20.8125 66.935C20.5103 67.5025 19.9399 67.8518 19.2957 67.8592C19.2883 67.8592 19.281 67.8607 19.2751 67.8607ZM14.6126 22.6794C9.32812 22.6794 5.0283 26.9895 5.0283 32.2858V49.3893C5.0283 51.9335 6.01887 54.3509 7.81869 56.195C9.66421 57.9963 12.0802 58.9957 14.6126 58.9957C14.8868 58.9957 15.1403 59.1446 15.273 59.3848L19.0407 66.2024C19.1129 66.3306 19.2176 66.3512 19.2751 66.3512C19.3001 66.3586 19.4254 66.3277 19.4858 66.2127L23.2815 59.3834C23.4157 59.1446 23.6677 58.9957 23.9419 58.9957H42.0817C47.3779 58.9957 51.6881 54.6856 51.6881 49.3893V32.2858C51.6881 26.9895 47.3779 22.6794 42.0817 22.6794H14.6126Z" fill="black"/>
    </svg>
  );
} 