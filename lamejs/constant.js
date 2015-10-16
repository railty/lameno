module.exports = {
  Encoder: {
    NORM_TYPE: 0,
    START_TYPE: 1,
    SHORT_TYPE: 2,
    STOP_TYPE: 3,
    SBMAX_l: 22,
    SBMAX_s: 13,
  },
  Lame: {
    LAME_MAXALBUMART: 128 * 1024,
    LAME_MAXMP3BUFFER: 16384 + 128 * 1024, //var LAME_MAXMP3BUFFER = (16384 + LAME_MAXALBUMART);
  },
  Takehiro: {
    slen1_tab: [0, 0, 0, 0, 3, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4],
    slen2_tab: [0, 1, 2, 3, 0, 1, 2, 3, 1, 2, 3, 1, 2, 3, 2, 3],
  },
};
