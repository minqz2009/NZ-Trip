// People presets
export const couples = [
  "Daniel & Rella",
  "Yahnis & Gloria",
  "CiCi & Kenny",
  "Lucy",
];

// Everyone shortcuts
const FOUR = ["Daniel & Rella", "Yahnis & Gloria"];          // before Lucy arrives
const FIVE = ["Daniel & Rella", "Yahnis & Gloria", "Lucy"];  // after Lucy arrives Jul 19
const ALL  = ["Daniel & Rella", "Yahnis & Gloria", "CiCi & Kenny", "Lucy"];

export const nzCenter = [-45.0312, 168.6626]; // Queenstown

// Accommodation
export const accommodations = [
  {
    name: "Queenstown Dart Retreat",
    address: "36/9 Juniper Place, Frankton, Queenstown 9300",
    coordinates: [-45.022, 168.745],
    startDate: "2026-07-18",
    endDate: "2026-07-22",
    url: "https://www.booking.com/hotel/nz/dart-retreat-queenstown-with-parking.en-gb.html",
  },
  {
    name: "Aspen View Luxury Villa",
    address: "2 Sainsbury Road, Queenstown 9300",
    coordinates: [-45.034, 168.643],
    startDate: "2026-07-22",
    endDate: "2026-07-26",
    url: "https://www.booking.com/hotel/nz/aspen-view-hot-tub-lake-view.en-gb.html",
  },
];

export const days = [
  "2026-07-18",
  "2026-07-19",
  "2026-07-20",
  "2026-07-21",
  "2026-07-22",
  "2026-07-23",
  "2026-07-24",
  "2026-07-25",
  "2026-07-26",
];

// Participant-based color palette
// Derive a consistent color from the participant set
const colorMap = {
  all: "#3b82f6",       // Blue - everyone (7 people)
  five: "#6366f1",      // Indigo - Daniel, Rella, Yahnis, Gloria, Lucy
  four: "#818cf8",      // Soft indigo - Daniel, Rella, Yahnis, Gloria (before Lucy)
  yg: "#a855f7",        // Purple - Yahnis & Gloria only
  drl: "#06b6d4",       // Cyan - Daniel, Rella & Lucy
  lucy: "#ec4899",      // Pink - Lucy only
  ck: "#f59e0b",        // Amber - CiCi & Kenny only
  logistics: "#64748b", // Slate - driving / logistics
};

function getParticipantColor(participants, isLogistics) {
  if (isLogistics) return colorMap.logistics;
  const key = participants.map(p => p).sort().join("|");
  if (key === ALL.sort().join("|")) return colorMap.all;
  if (key === FIVE.sort().join("|")) return colorMap.five;
  if (key === FOUR.sort().join("|")) return colorMap.four;
  if (key === ["Yahnis & Gloria"].join("|")) return colorMap.yg;
  if (key === ["Daniel & Rella", "Lucy"].sort().join("|")) return colorMap.drl;
  if (key === ["Lucy"].join("|")) return colorMap.lucy;
  if (key === ["CiCi & Kenny"].join("|")) return colorMap.ck;
  // Fallback: hash based
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

// Shared rental-car pickup/return location (Ezi Car Rental, Queenstown Airport)
const EZI_CAR_RENTAL = {
  location: "Ezi Car Rental – Queenstown Airport",
  navAddress:
    "Ezi Car Rental Queenstown Airport, Sir Henry Wigley Drive, Frankton, Queenstown 9300, New Zealand",
  coordinates: [-45.0220501, 168.7397107],
  link: "https://www.google.com/maps/dir/-33.9692747,151.0184134/Ezi+Car+Rental+-+Queenstown+Airport,+Sir+Henry+Wigley+Drive,+Frankton,+Queenstown+9300,+New+Zealand/@-39.0131992,149.2870529,5z/data=!4m9!4m8!1m1!4e1!1m5!1m1!1s0xa9d51e46ee087a1b:0x94c84d3258033b2e!2m2!1d168.7397107!2d-45.0220501?entry=ttu&g_ep=EgoyMDI2MDYwMS4wIKXMDSoASAFQAw%3D%3D",
};

// Rental reservations
const RES_MAIN = { label: "Daniel Chen & Rella", number: "R1QBF7", image: "/NZ-Trip/car_rental_daniel.png" };
const RES_CK   = { label: "CiCi & Kenny",        number: "R1QBFF", image: "/NZ-Trip/car_rental_kenny.png"  };

export const activities = [
  // ────── July 18 ──────
  {
    id: "18-1",
    date: "2026-07-18",
    startTime: "09:00",
    endTime: "13:00",
    title: "✈️ Flight to Queenstown (VA161)",
    location: "Queenstown Airport (ZQN)",
    coordinates: [-45.021, 168.739],
    participants: FOUR,
    description: "Daniel, Rella, Yahnis & Gloria 乘 VA161/VOZ161 飞往皇后镇",
    sequence: 1,
    isLogistics: true,
    link: "https://zh.flightaware.com/live/flight/VOZ161",
  },
  {
    id: "18-2c",
    date: "2026-07-18",
    startTime: "13:00",
    endTime: "13:45",
    title: "🚗 Pick Up Rental Car",
    location: EZI_CAR_RENTAL.location,
    navAddress: EZI_CAR_RENTAL.navAddress,
    coordinates: EZI_CAR_RENTAL.coordinates,
    participants: FOUR,
    description: "落地后在机场 Ezi Car Rental 取车，点开查看预订号",
    sequence: 2,
    isLogistics: true,
    link: EZI_CAR_RENTAL.link,
    reservations: [RES_MAIN],
  },
  {
    id: "18-2",
    date: "2026-07-18",
    startTime: "14:00",
    endTime: "15:30",
    title: "🏠 Check-in Dart Retreat",
    location: "Queenstown Dart Retreat, Frankton",
    coordinates: [-45.022, 168.745],
    participants: FOUR,
    description: "前往 Dart Retreat 入住",
    sequence: 3,
    isLogistics: true,
    link: "https://www.booking.com/hotel/nz/dart-retreat-queenstown-with-parking.en-gb.html",
  },
  {
    id: "18-3",
    date: "2026-07-18",
    startTime: "15:30",
    endTime: "17:00",
    title: "🥝 Kiwi Park",
    location: "Kiwi Birdlife Park, Brecon St",
    coordinates: [-45.0285, 168.6575],
    participants: FOUR,
    description:
      "目标 3:45pm 场次\n最晚入园 4:15pm (关门 5pm)\nKiwi encounter: 10/11/12:15/1/2/3:45/4:30\nConservation show: 11:30am / 3pm\n现场购票 NZ$65.6pp",
    sequence: 4,
    link: "https://kiwibird.co.nz/",
  },

  // ────── July 19 ──────
  {
    id: "19-1",
    date: "2026-07-19",
    startTime: "07:50",
    endTime: "11:30",
    title: "🪂 NZONE Skydive",
    location: "35 Shotover St, Queenstown",
    coordinates: [-45.031265, 168.659708],
    participants: ["Yahnis & Gloria"],
    description:
      "最早 8am 一班\n淘宝 ¥2156.5 / Agoda A$451.55\n官网 NZ$549pp\nPhoto package 只能当天现场买",
    sequence: 1,
    link: "https://www.nzoneskydive.co.nz/",
  },
  {
    id: "19-2",
    date: "2026-07-19",
    startTime: "11:00",
    endTime: "13:00",
    title: "🍽️ Lunch in Queenstown",
    location: "Queenstown CBD",
    coordinates: [-45.0312, 168.6626],
    participants: FOUR,
    description: "市区午餐 (Lucy 尚未到达)",
    sequence: 2,
  },
  {
    id: "19-3",
    date: "2026-07-19",
    startTime: "12:20",
    endTime: "13:10",
    title: "✈️ Pick Up Lucy",
    location: "Queenstown Airport (ZQN)",
    coordinates: [-45.021, 168.739],
    participants: ["Lucy"],
    description: "Lucy 12:20pm 落地，约 1:00pm 领完行李\n1:10pm 去机场接",
    sequence: 3,
    isLogistics: true,
  },
  {
    id: "19-4",
    date: "2026-07-19",
    startTime: "13:30",
    endTime: "15:00",
    title: "🚗 Drive to Horse Trek",
    location: "Dart Valley Rd, Glenorchy",
    coordinates: [-44.838, 168.38],
    participants: FIVE,
    description: "约 1.5hr 车程前往 Lighthorse Adventures",
    sequence: 4,
    isLogistics: true,
  },
  {
    id: "19-5",
    date: "2026-07-19",
    startTime: "15:00",
    endTime: "17:00",
    title: "🐴 Horse Riding",
    location: "Lighthorse Adventures, Glenorchy",
    coordinates: [-44.838, 168.38],
    participants: FIVE,
    description:
      "1.5hr Walk Only NZ$209pp\n2.5hr Walk+Trot NZ$319-540pp\n过河看天气，≥105kg 需提前确认\n结束后开车回市区",
    sequence: 5,
    link: "https://www.lighthorseadventures.com/",
  },

  // ────── July 20 ──────
  {
    id: "20-1",
    date: "2026-07-20",
    startTime: "08:30",
    endTime: "10:00",
    title: "🚗 Drive to Mt Cook Area",
    location: "Queenstown → Mt Cook",
    coordinates: [-44.0, 169.8],
    participants: FIVE,
    description: "约 1.5hr 车程",
    sequence: 1,
    isLogistics: true,
  },
  {
    id: "20-2",
    date: "2026-07-20",
    startTime: "10:00",
    endTime: "15:00",
    title: "🚁 Heli Glacier Hike",
    location: "Tasman Glacier",
    coordinates: [-43.683, 170.167],
    participants: ["Yahnis & Gloria"],
    description:
      "直升机冰川徒步\n需提前 45 分钟到达\n建议提前一个月预订",
    sequence: 2,
    link: "https://www.everythingnewzealand.com/en/mt-cook/tasman-glacier-heli-hike",
  },
  {
    id: "20-3",
    date: "2026-07-20",
    startTime: "10:00",
    endTime: "15:00",
    title: "🏔️ Tasman Glacier Lake Hike",
    location: "Tasman Glacier Car Park, Mt Cook",
    coordinates: [-43.683, 170.167],
    participants: ["Daniel & Rella", "Lucy"],
    description:
      "冰湖徒步约 3.5hr\n如想坐冰湖游船需提早订",
    sequence: 2,
  },
  {
    id: "20-4",
    date: "2026-07-20",
    startTime: "15:00",
    endTime: "16:30",
    title: "🐟 High Country Salmon",
    location: "Twizel-Omarama Hwy, Twizel",
    coordinates: [-44.283, 170.088],
    participants: FIVE,
    description:
      "营业时间 10am - 7pm\n可以钓鱼体验",
    sequence: 3,
    link: "https://www.highcountrysalmon.co.nz/",
  },
  {
    id: "20-5",
    date: "2026-07-20",
    startTime: "17:00",
    endTime: "19:30",
    title: "🚗 Drive Back to Queenstown",
    location: "Twizel → Queenstown",
    coordinates: [-45.0312, 168.6626],
    participants: FIVE,
    description: "约 2.5hr 车程",
    sequence: 4,
    isLogistics: true,
  },

  // ────── July 21 ──────
  {
    id: "21-1",
    date: "2026-07-21",
    startTime: "09:00",
    endTime: "11:00",
    title: "🦈 Hydro Attack (Shark Boat)",
    location: "Lapsley Butson Wharf, Queenstown",
    coordinates: [-45.032, 168.661],
    participants: FIVE,
    description:
      "位置不多，需要尽快预订！",
    sequence: 1,
    link: "https://book.hydroattack.co.nz/",
  },
  {
    id: "21-2",
    date: "2026-07-21",
    startTime: "09:00",
    endTime: "11:00",
    title: "🪂 Paragliding",
    location: "Skyline Gondola, Queenstown",
    coordinates: [-45.0305, 168.6515],
    participants: ["Lucy"],
    description:
      "Lucy 单独活动\n需要搭 Skyline 缆车上山，可以买包含缆车+Luge 套票",
    sequence: 1,
  },
  {
    id: "21-3",
    date: "2026-07-21",
    startTime: "12:00",
    endTime: "17:00",
    title: "🚡 Skyline Gondola + Luge",
    location: "Skyline Queenstown, Brecon St",
    coordinates: [-45.0305, 168.6515],
    participants: FIVE,
    description:
      "缆车 9:30am - 9pm / Luge 10am - 7pm\n有三合一套票\nPremium 自助餐: 4:45/5/7:45/8pm",
    sequence: 2,
    link: "https://queenstown.skyline.co.nz/things-to-do/queenstown-gondola/gondola-prices/",
  },

  // ────── July 22 ──────
  {
    id: "22-1",
    date: "2026-07-22",
    startTime: "09:00",
    endTime: "10:00",
    title: "📦 Checkout Dart Retreat",
    location: "Queenstown Dart Retreat, Frankton",
    coordinates: [-45.022, 168.745],
    participants: FIVE,
    description: "退房 + 1hr 开车前往 Cardrona",
    sequence: 1,
    isLogistics: true,
  },
  {
    id: "22-2",
    date: "2026-07-22",
    startTime: "10:00",
    endTime: "12:00",
    title: "🔫 Real Guns NZ",
    location: "1081 Cardrona Valley Rd, Cardrona",
    coordinates: [-44.88, 168.95],
    participants: FIVE,
    description:
      "NZ$184.13pp (supervised shooting)\n需提前预约",
    sequence: 2,
    link: "https://www.realguns.nz/",
  },
  {
    id: "22-3",
    date: "2026-07-22",
    startTime: "14:00",
    endTime: "15:00",
    title: "🏠 Check-in Aspen View Villa",
    location: "2 Sainsbury Rd, Queenstown",
    coordinates: [-45.034, 168.643],
    participants: FIVE,
    description: "入住 Aspen View Luxury Villa (Hot Tub 🛁)",
    sequence: 3,
    isLogistics: true,
    link: "https://www.booking.com/hotel/nz/aspen-view-hot-tub-lake-view.en-gb.html",
  },
  {
    id: "22-4",
    date: "2026-07-22",
    startTime: "21:00",
    endTime: "23:00",
    title: "✈️ CiCi & Kenny Arrive (QF123)",
    location: "Queenstown Airport (ZQN)",
    coordinates: [-45.021, 168.739],
    participants: ["CiCi & Kenny"],
    description: "CiCi 和 Kenny 晚上抵达，航班 QF123",
    sequence: 4,
    isLogistics: true,
    link: "https://zh.flightaware.com/live/flight/QFA123",
  },

  // ────── July 23 ──────
  {
    id: "23-0c",
    date: "2026-07-23",
    startTime: "07:00",
    endTime: "07:30",
    title: "🚗 CiCi & Kenny Pick Up Car",
    location: EZI_CAR_RENTAL.location,
    navAddress: EZI_CAR_RENTAL.navAddress,
    coordinates: EZI_CAR_RENTAL.coordinates,
    participants: ["CiCi & Kenny"],
    description: "CiCi & Kenny 在机场取车，点开查看预订号",
    sequence: 1,
    isLogistics: true,
    link: EZI_CAR_RENTAL.link,
    reservations: [RES_CK],
  },
  {
    id: "23-1",
    date: "2026-07-23",
    startTime: "08:00",
    endTime: "16:00",
    title: "⛷️ Skiing - Day 1",
    location: "Coronet Peak",
    coordinates: [-44.9282, 168.7369],
    participants: ALL,
    description: "全员滑雪 Day 1",
    sequence: 2,
  },

  // ────── July 24 ──────
  {
    id: "24-1",
    date: "2026-07-24",
    startTime: "08:00",
    endTime: "16:00",
    title: "⛷️ Skiing - Day 2",
    location: "The Remarkables",
    coordinates: [-45.0531, 168.8117],
    participants: ALL,
    description: "全员滑雪 Day 2",
    sequence: 1,
  },

  // ────── July 25 ──────
  {
    id: "25-1",
    date: "2026-07-25",
    startTime: "08:00",
    endTime: "16:00",
    title: "⛷️ Skiing - Day 3",
    location: "Cardrona Alpine Resort",
    coordinates: [-44.8624, 168.9501],
    participants: ALL,
    description: "全员滑雪 Day 3",
    sequence: 1,
  },

  // ────── July 26 ──────
  {
    id: "26-1",
    date: "2026-07-26",
    startTime: "08:00",
    endTime: "16:00",
    title: "⛷️ Skiing - Day 4",
    location: "Coronet Peak / Remarkables",
    coordinates: [-44.9282, 168.7369],
    participants: ALL,
    description: "全员滑雪最后一天！",
    sequence: 1,
  },
  {
    id: "26-1r",
    date: "2026-07-26",
    startTime: "16:30",
    endTime: "17:00",
    title: "🔄 Return Rental Cars",
    location: EZI_CAR_RENTAL.location,
    navAddress: EZI_CAR_RENTAL.navAddress,
    coordinates: EZI_CAR_RENTAL.coordinates,
    participants: ALL,
    description: "滑雪结束后在机场还车，点开查看两组预订号",
    sequence: 2,
    isLogistics: true,
    link: EZI_CAR_RENTAL.link,
    reservations: [RES_MAIN, RES_CK],
  },
  {
    id: "26-2",
    date: "2026-07-26",
    startTime: "18:00",
    endTime: "21:00",
    title: "🎉 Last Night Dinner",
    location: "Queenstown CBD",
    coordinates: [-45.0312, 168.6626],
    participants: ALL,
    description: "最后一晚聚餐 🍷",
    sequence: 3,
  },
  {
    id: "26-3",
    date: "2026-07-26",
    startTime: "21:00",
    endTime: "23:59",
    title: "✈️ Flight Home (JQ224)",
    location: "Queenstown Airport (ZQN)",
    coordinates: [-45.021, 168.739],
    participants: ["Daniel & Rella", "Yahnis & Gloria"],
    description: "Daniel, Rella, Yahnis & Gloria 乘 JQ224 回程",
    sequence: 4,
    isLogistics: true,
    link: "https://zh.flightaware.com/live/flight/JST224",
  },
];

// Attach computed color to each activity
activities.forEach((a) => {
  a.color = getParticipantColor(a.participants, a.isLogistics);
});

// ─────────────────────────────────────────────────────────────
// Time-aware status helpers
// All schedule times are local NZ wall-clock strings; we build
// Date objects from them and compare against a provided "now".
// ─────────────────────────────────────────────────────────────

// Treat anything starting within this window as "about to start".
const SOON_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function toDateTime(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00`);
}

// Returns one of: 'upcoming' | 'soon' | 'in-progress' | 'ended'
export function getActivityStatus(activity, now) {
  const start = toDateTime(activity.date, activity.startTime);
  const end = toDateTime(activity.date, activity.endTime);
  if (now >= end) return "ended";
  if (now >= start) return "in-progress";
  if (start - now <= SOON_WINDOW_MS) return "soon";
  return "upcoming";
}

// Returns one of: 'past' | 'today' | 'future' for a 'YYYY-MM-DD' day.
export function getDayStatus(dayStr, now) {
  const dayStart = new Date(`${dayStr}T00:00:00`);
  const dayEnd = new Date(`${dayStr}T23:59:59`);
  if (now > dayEnd) return "past";
  if (now >= dayStart) return "today";
  return "future";
}

// Which accommodation covers a given 'YYYY-MM-DD' day.
// On a transition day (checkout + checkin) the later check-in wins,
// since that's where we actually sleep that night.
export function getAccommodationForDay(dayStr) {
  let match = null;
  for (const acc of accommodations) {
    if (dayStr >= acc.startDate && dayStr <= acc.endDate) match = acc;
  }
  return match;
}

// Group a list of consecutive day strings into accommodation blocks:
// [{ key, accommodation, days: [...] }]
export function groupDaysByAccommodation(dayList) {
  const groups = [];
  for (const day of dayList) {
    const acc = getAccommodationForDay(day);
    const key = acc ? acc.name : "other";
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.days.push(day);
    } else {
      groups.push({ key, accommodation: acc, days: [day] });
    }
  }
  return groups;
}
