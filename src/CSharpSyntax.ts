// vscode 모듈에 의존하지 않는 순수 C# 구문 헬퍼 (단위 테스트 대상)

const classRegex = /\bclass\s+\w+/;

/**
 * class 선언이 처음 등장하는 줄의 인덱스를 반환한다.
 * class 선언이 없으면 undefined를 반환한다. (interface/enum/struct 전용 파일 대응)
 */
export function findClassLine(lines: string[]): number | undefined {
    const index = lines.findIndex((line) => classRegex.test(line));
    return index === -1 ? undefined : index;
}
