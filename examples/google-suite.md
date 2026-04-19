# Google Sample Suite

This suite tests Puppet against `google.com` using the live REST API.

## 1. Open One Live Page

```bash
curl -s -X POST http://127.0.0.1:4017/api/pages/open \
  -H 'content-type: application/json' \
  --data '{
    "pages": [
      { "role": "page", "url": "https://www.google.com/", "width": 1440, "height": 900 }
    ]
  }'
```

Save the returned `pageId`.

## 2. Type, Wait For Suggestions, Click A Suggestion

```bash
curl -s -X POST http://127.0.0.1:4017/api/pages/actions \
  -H 'content-type: application/json' \
  --data '{
    "actions": [
      { "type": "wait_for_selector", "pageId": "PAGE_ID", "selector": "textarea[name='\''q'\'']", "visible": true, "timeoutMs": 30000 },
      { "type": "type_text", "pageId": "PAGE_ID", "selector": "textarea[name='\''q'\'']", "value": "puppet browser automation", "clearFirst": true },
      { "type": "wait_for_selector", "pageId": "PAGE_ID", "selector": "[role='\''listbox'\'']", "visible": true, "timeoutMs": 30000 },
      { "type": "click", "pageId": "PAGE_ID", "selector": "[role='\''option'\'']", "index": 1, "waitUntil": "networkidle2" },
      { "type": "wait_for_selector", "pageId": "PAGE_ID", "selector": "#search, #center_col, a h3", "visible": true, "timeoutMs": 30000 }
    ]
  }'
```

## 3. Scroll The Results

```bash
curl -s -X POST http://127.0.0.1:4017/api/pages/actions \
  -H 'content-type: application/json' \
  --data '{
    "actions": [
      { "type": "scroll", "pageId": "PAGE_ID", "deltaY": 900 }
    ]
  }'
```

## 4. Read Results Data

```bash
curl -s -X POST http://127.0.0.1:4017/api/pages/data \
  -H 'content-type: application/json' \
  --data '{
    "pageId": "PAGE_ID",
    "selector": "#search"
  }'
```

## 5. Read Results HTML

```bash
curl -s -X POST http://127.0.0.1:4017/api/pages/html \
  -H 'content-type: application/json' \
  --data '{
    "pageId": "PAGE_ID",
    "selector": "#search"
  }'
```

## 6. Record And Diff The Search Box

```bash
curl -s -X POST http://127.0.0.1:4017/api/pages/actions \
  -H 'content-type: application/json' \
  --data '{
    "actions": [
      { "type": "record_start", "pageId": "PAGE_ID", "recordId": "search-box", "selector": "textarea[name='\''q'\'']", "include": ["classes", "styles", "tree", "box"] },
      { "type": "type_text", "pageId": "PAGE_ID", "selector": "textarea[name='\''q'\'']", "value": " updated", "clearFirst": false },
      { "type": "record_stop", "pageId": "PAGE_ID", "recordId": "search-box" }
    ]
  }'
```

## 7. Screenshot

```bash
curl -s -X POST http://127.0.0.1:4017/api/pages/screenshot \
  -H 'content-type: application/json' \
  --data '{
    "pageId": "PAGE_ID",
    "fullPage": true
  }'
```

## 8. Close The Page

```bash
curl -s -X POST http://127.0.0.1:4017/api/pages/close \
  -H 'content-type: application/json' \
  --data '{
    "pageId": "PAGE_ID"
  }'
```
