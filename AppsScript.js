function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = data.action;

    if (action === "addExpense") {
      var sheet = getOrCreateSheet(ss, "Expenses", ["Date","Category","Amount","Note","Time","ID"]);
      sheet.appendRow([data.date, data.category, data.amount, data.note || "", data.time || "", data.id]);
      return jsonResponse({status: "ok"});
    }

    if (action === "deleteExpense") {
      var sheet = ss.getSheetByName("Expenses");
      if (sheet) {
        var values = sheet.getDataRange().getValues();
        for (var i = values.length - 1; i > 0; i--) {
          if (values[i][5] === data.id) {
            sheet.deleteRow(i + 1);
            break;
          }
        }
      }
      return jsonResponse({status: "ok"});
    }

    if (action === "saveSettings") {
      var sheet = getOrCreateSheet(ss, "Settings", ["Key","Value"]);
      var vals = sheet.getDataRange().getValues();
      var keys = {income: data.income, invest: data.invest, target: data.target};
      for (var key in keys) {
        var found = false;
        for (var i = 1; i < vals.length; i++) {
          if (vals[i][0] === key) {
            sheet.getRange(i + 1, 2).setValue(keys[key]);
            found = true;
            break;
          }
        }
        if (!found) sheet.appendRow([key, keys[key]]);
      }
      return jsonResponse({status: "ok"});
    }

    if (action === "syncAll") {
      var sheet = getOrCreateSheet(ss, "Expenses", ["Date","Category","Amount","Note","Time","ID"]);
      if (sheet.getLastRow() > 1) {
        sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).clearContent();
      }
      var expenses = data.expenses || [];
      for (var i = 0; i < expenses.length; i++) {
        var exp = expenses[i];
        sheet.appendRow([exp.date, exp.category, exp.amount, exp.note || "", exp.time || "", exp.id]);
      }
      return jsonResponse({status: "ok", count: expenses.length});
    }

    return jsonResponse({status: "error", message: "Unknown action"});
  } catch (err) {
    return jsonResponse({status: "error", message: err.toString()});
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return jsonResponse({status: "ok", message: "CashFlow Sync API"});
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
  return sheet;
}

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  getOrCreateSheet(ss, "Expenses", ["Date","Category","Amount","Note","Time","ID"]);
  getOrCreateSheet(ss, "Settings", ["Key","Value"]);
  var old = ss.getSheetByName("Sheet1");
  if (old) ss.deleteSheet(old);
}
