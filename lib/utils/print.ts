/**
 * 모달 안의 한 영역만 종이에 내보내기
 * ====================================
 *
 * 모달은 body 바로 아래에 그려진다(portal). 그래서 인쇄 직전에
 * "인쇄할 영역을 담고 있는 body 의 직계 자식"을 찾아 표시해 두면,
 * globals.css 의 인쇄 규칙이 그 하나만 남기고 나머지를 걷어낼 수 있다.
 *
 * visibility 가 아니라 display 로 걷어내는 이유는 globals.css 에 적어 두었다.
 */
export function printRegion(node: HTMLElement | null) {
  const root = (() => {
    let el: HTMLElement | null = node;
    while (el && el.parentElement !== document.body) el = el.parentElement;
    return el;
  })();

  document.body.classList.add("print-report");
  root?.classList.add("print-root");

  const cleanup = () => {
    document.body.classList.remove("print-report");
    root?.classList.remove("print-root");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
  // afterprint 를 주지 않는 브라우저를 대비한 보험
  window.setTimeout(cleanup, 3000);
}
