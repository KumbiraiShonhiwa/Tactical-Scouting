---
name: data-quality
description: Data-quality validation skill for ETL staging, source drift, normalization and safe publication.
---
# Data Quality

Before atomic publication verify:
- required fields;
- plausible statistic ranges;
- no duplicate player/season rows;
- valid normalization;
- source attribution;
- schema compatibility.

Invalid records go to quarantine with a reason.

Schema-drift checks should compare recorded source fixtures and fail loudly when source structure changes.

Never silently coerce materially invalid football data into plausible-looking values.
