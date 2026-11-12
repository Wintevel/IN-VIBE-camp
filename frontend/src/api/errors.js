const ERRORS = {
  CANNOT_LIKE_OWN_REPORT: '내가 올린 제보에는 하트를 누를 수 없어요',
  REPORT_NOT_OPEN: '지금은 수락할 수 없는 의뢰예요',
  ALREADY_JOINED: '이미 수락한 의뢰예요',
  REPORT_FULL: '인원이 다 찼어요',
  NOT_PARTICIPATING: '수락한 의뢰가 아니에요',
  REPORT_NOT_IN_PROGRESS: '아직 인원이 다 모이지 않았어요',
  DEADLINE_PASSED: '인증 시간이 지났어요. 다시 수락해 주세요',
  NOT_ENOUGH_POINTS: '포인트가 부족해요',
  DAILY_LIMIT: '오늘은 3개까지 완료할 수 있어요. 내일 다시 도전해요',
  ALREADY_IN_CREW: '이미 가입한 크루가 있어요. 먼저 탈퇴해 주세요',
  CREW_NAME_TAKEN: '같은 이름의 크루가 이미 있어요',
  CREW_NOT_FOUND: '크루를 찾지 못했어요',
  NOT_IN_CREW: '가입한 크루가 없어요',
  CREW_NOT_READY: '서버에 크루 기능이 아직 없어요',
  HEART_DAILY_LIMIT: '오늘 하트 10개를 다 썼어요. 내일 다시 누를 수 있어요',
  TOO_FAR: '의뢰 장소에서 100m 안에서 찍은 사진만 인증할 수 있어요',
}

export function errorText(error) {
  const msg = error?.message || ''
  const code = Object.keys(ERRORS).find((k) => msg.includes(k))
  if (code) return ERRORS[code]
  if (/network|fetch/i.test(msg)) return '서버에 연결하지 못했어요. 네트워크를 확인해 주세요'
  return msg || '문제가 생겼어요. 다시 시도해 주세요'
}
