-- Review-step preview: how it's doing, last 30 days, by device.
-- From worker/:  npx wrangler d1 execute euclid --remote --file=queries/preview-summary.sql
-- (or paste into the D1 console). Times are in seconds.
--
-- visits         visits to the Review step
-- exported_pct   share that pressed Export in that visit
-- left_pct       share that closed or hid the tab without exporting
-- back_pct       share that went back to another step
-- render_avg_s   average time from opening Review to the first pages
-- render_slow    visits where the first pages took over 5 seconds
-- never_drew     visits that ended before any page showed
-- stay_avg_s     average time on Review
-- failed         visits where the preview fell back to the HTML look-alike
SELECT
  device,
  COUNT(*)                                                         AS visits,
  ROUND(100.0 * SUM(outcome = 'exported') / COUNT(*), 1)           AS exported_pct,
  ROUND(100.0 * SUM(outcome = 'left') / COUNT(*), 1)               AS left_pct,
  ROUND(100.0 * SUM(outcome = 'back') / COUNT(*), 1)               AS back_pct,
  ROUND(AVG(render_ms) / 1000.0, 1)                                AS render_avg_s,
  SUM(render_ms > 5000)                                            AS render_slow,
  SUM(render_ms IS NULL)                                           AS never_drew,
  ROUND(AVG(stay_ms) / 1000.0, 1)                                  AS stay_avg_s,
  SUM(preview_failed)                                              AS failed
FROM preview_visits
WHERE created_at >= CAST(strftime('%s', 'now', '-30 days') AS INTEGER)
GROUP BY device
UNION ALL
SELECT
  'all',
  COUNT(*),
  ROUND(100.0 * SUM(outcome = 'exported') / COUNT(*), 1),
  ROUND(100.0 * SUM(outcome = 'left') / COUNT(*), 1),
  ROUND(100.0 * SUM(outcome = 'back') / COUNT(*), 1),
  ROUND(AVG(render_ms) / 1000.0, 1),
  SUM(render_ms > 5000),
  SUM(render_ms IS NULL),
  ROUND(AVG(stay_ms) / 1000.0, 1),
  SUM(preview_failed)
FROM preview_visits
WHERE created_at >= CAST(strftime('%s', 'now', '-30 days') AS INTEGER);
