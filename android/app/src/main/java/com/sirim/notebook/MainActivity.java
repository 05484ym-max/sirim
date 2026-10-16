package com.sirim.notebook;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.PrintManager;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.util.Base64;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;

import java.io.IOException;
import java.io.OutputStream;

/**
 * Android packaging only. The existing HTML, CSS and JavaScript are bundled unchanged.
 * Song data remains in the WebView's private localStorage on this device.
 */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/assets/web/index.html";
    private static final int PICK_JSON = 401;
    private static final int SAVE_JSON = 402;
    private static final int MAX_BACKUP_BASE64 = 16 * 1024 * 1024;

    // Native adapters for the existing website's window.print() and Blob JSON download.
    // Nothing in the original app.js or HTML needs to change.
    private static final String BRIDGE_SCRIPT =
        "(function(){"
        + "if(window.__sirimAndroidReady)return;"
        + "window.__sirimAndroidReady=true;"
        + "window.print=function(){SirimAndroid.requestPrint();};"
        + "document.addEventListener('click',function(e){"
        + "var a=e.target.closest&&e.target.closest('a[download]');"
        + "if(!a||!a.href||a.href.slice(0,5)!=='blob:')return;"
        + "e.preventDefault();e.stopImmediatePropagation();"
        + "fetch(a.href).then(function(r){return r.blob();}).then(function(b){"
        + "var reader=new FileReader();"
        + "reader.onload=function(){"
        + "var encoded=String(reader.result).split(',')[1];"
        + "if(encoded)SirimAndroid.saveJson(encoded,a.download||'sirim-backup.json');"
        + "};reader.readAsDataURL(b);"
        + "}).catch(function(){alert('לא ניתן לשמור את קובץ הגיבוי');});"
        + "},true);"
        + "})();";

    private WebView webView;
    private WebViewAssetLoader assetLoader;
    private android.webkit.ValueCallback<Uri[]> pendingChooser;
    private byte[] pendingBackup;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        // Service-worker requests are separate from WebViewClient requests.
        // Serve the same bundled assets to both, so the original PWA can register offline.
        ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                return loadLocalAsset(request.getUrl());
            }
        });

        webView = new WebView(this);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setBackgroundColor(0xFFF1F1E5);
        webView.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);
        webView.setFocusableInTouchMode(true);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        webView.addJavascriptInterface(new NativeBridge(), "SirimAndroid");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loadLocalAsset(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                Uri url = request.getUrl();
                if ("https".equals(url.getScheme()) && HOST.equals(url.getHost())
                        && url.getPath() != null && url.getPath().startsWith("/assets/web/")) {
                    return false;
                }
                String scheme = url.getScheme();
                if ("https".equals(scheme) || "http".equals(scheme)) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, url));
                    } catch (ActivityNotFoundException ignored) {
                        Toast.makeText(MainActivity.this, "לא ניתן לפתוח את הקישור", Toast.LENGTH_SHORT).show();
                    }
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (START_URL.equals(url)) view.evaluateJavascript(BRIDGE_SCRIPT, null);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view,
                    android.webkit.ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams) {
                if (pendingChooser != null) pendingChooser.onReceiveValue(null);
                pendingChooser = filePathCallback;
                try {
                    startActivityForResult(fileChooserParams.createIntent(), PICK_JSON);
                    return true;
                } catch (ActivityNotFoundException | SecurityException e) {
                    pendingChooser.onReceiveValue(null);
                    pendingChooser = null;
                    Toast.makeText(MainActivity.this, "לא ניתן לבחור קובץ", Toast.LENGTH_SHORT).show();
                    return false;
                }
            }
        });

        setContentView(webView);
        webView.loadUrl(START_URL);
    }

    private WebResourceResponse loadLocalAsset(Uri uri) {
        if ("https".equals(uri.getScheme()) && HOST.equals(uri.getHost())
                && "/assets/web/".equals(uri.getPath())) {
            try {
                return new WebResourceResponse("text/html", "UTF-8",
                        getAssets().open("web/index.html"));
            } catch (IOException ignored) {
                return null;
            }
        }
        return assetLoader.shouldInterceptRequest(uri);
    }

    private final class NativeBridge {
        @JavascriptInterface
        public void requestPrint() {
            runOnUiThread(() -> {
                PrintManager manager = (PrintManager) getSystemService(PRINT_SERVICE);
                if (manager != null) {
                    manager.print("שירים",
                            webView.createPrintDocumentAdapter("שירים"),
                            new PrintAttributes.Builder().build());
                }
            });
        }

        @JavascriptInterface
        public void saveJson(String encoded, String proposedName) {
            if (encoded == null || encoded.length() > MAX_BACKUP_BASE64) return;
            final byte[] bytes;
            try {
                bytes = Base64.decode(encoded, Base64.DEFAULT);
            } catch (IllegalArgumentException ignored) {
                return;
            }
            String name = (proposedName == null ? "" : proposedName)
                    .replaceAll("[^\\p{L}\\p{N}._-]", "_");
            if (name.isEmpty()) name = "sirim-backup.json";
            if (!name.toLowerCase(java.util.Locale.ROOT).endsWith(".json")) name += ".json";
            final String fileName = name;
            runOnUiThread(() -> {
                pendingBackup = bytes;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_TITLE, fileName);
                try {
                    startActivityForResult(intent, SAVE_JSON);
                } catch (ActivityNotFoundException e) {
                    pendingBackup = null;
                    Toast.makeText(MainActivity.this, "אין אפליקציה לשמירת קבצים", Toast.LENGTH_LONG).show();
                }
            });
        }
    }

    @Override
    @SuppressWarnings("deprecation")
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == PICK_JSON) {
            if (pendingChooser != null) {
                pendingChooser.onReceiveValue(
                        WebChromeClient.FileChooserParams.parseResult(resultCode, data));
                pendingChooser = null;
            }
        } else if (requestCode == SAVE_JSON) {
            byte[] bytes = pendingBackup;
            pendingBackup = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null && bytes != null) {
                try (OutputStream out = getContentResolver().openOutputStream(data.getData())) {
                    if (out == null) throw new IOException("No output stream");
                    out.write(bytes);
                    Toast.makeText(this, "הגיבוי נשמר", Toast.LENGTH_SHORT).show();
                } catch (IOException e) {
                    Toast.makeText(this, "שמירת הגיבוי נכשלה", Toast.LENGTH_LONG).show();
                }
            }
        }
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (pendingChooser != null) {
            pendingChooser.onReceiveValue(null);
            pendingChooser = null;
        }
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
