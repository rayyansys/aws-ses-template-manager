const currentVersion = "v1.5.4";

let previousFillVarsText = "";
let templateName = "";

const parseJSONText = (jsonText) => {
  return JSON.parse(jsonText || "{}");
}

// updates email Live Preview
const onCodeMirrorChange = (editor) => {

  $("#templatePreview").attr("srcDoc", editor.getValue());

  // get variables enclosed with {} from editor
  let variables =
    editor.getValue().match(/(?<=\{{2})[A-Za-z_]+[a-zA-Z0-9_f]*(?=\}{2})/g) || [];

  const fillVars = parseJSONText(
    window.fillVarsCodeMirrorEditor.getValue()
  );


  const newFillVars = `{\n  ${variables
    .map((variable) => `"${variable}": "${fillVars[variable] || ""}"`)
    .join(",\n  ")}\n}`;

  // set fill vars json
  window.fillVarsCodeMirrorEditor.setValue(newFillVars);

  previousFillVarsText = fillVars;

  setTimeout(() => {
    onFillVarsSave();
  }, 1);
};

const onFillVarsOpen = () => {
  this.fillVarsCodeMirrorEditor.refresh();
};

const onFillVarsChange = (editor) => {
  const fillVars = editor.getValue();

  const parsedVariables = JSON.parse(fillVars);

  let newPreviewContent = window.codeMirrorEditor.getValue();

  for (const variable in parsedVariables) {
    newPreviewContent = newPreviewContent.replaceAll(
      new RegExp(`{{${variable}}}`, "g"),
      parsedVariables[variable]
    );
  }

  // don't set content yet, wait for save-changes to be clicked
  $("#templatePreview").attr("data-srcDoc", newPreviewContent);
};

const onFillVarsSave = () => {
  previousFillVarsText = window.fillVarsCodeMirrorEditor.getValue()

  const lcFillVars = parseJSONText(localStorage.getItem("fillVars"));

  const newLcFillVars = {
    ...lcFillVars,
    [templateName]: {
      ...lcFillVars[templateName],
      ...parseJSONText(previousFillVarsText)
    }
  };

  localStorage.setItem("fillVars", JSON.stringify(newLcFillVars));

  $("#templatePreview").attr(
    "srcDoc",
    $("#templatePreview").attr("data-srcDoc")
  );

  $("#fillVarsModal").modal("hide");

  // refresh after timeout to make sure content is updated
  setTimeout(() => {
    window.fillVarsCodeMirrorEditor.refresh();
  }, 250);
};

const onFillVarsClose = () => {
  $("#templatePreview").attr("data-srcDoc", "");

  window.fillVarsCodeMirrorEditor.setValue(previousFillVarsText || "{\n  \n}");

  // refresh after timeout to make sure content is updated
  setTimeout(() => {
    window.fillVarsCodeMirrorEditor.refresh();
  }, 250);
};

// contributor's defined global variable "window.codeMirrorEditor" wont be available right away, so we need to wait for it to be available
function listenToCodeMirror() {
  const editor = window.codeMirrorEditor;
  const varsEditor = window.fillVarsCodeMirrorEditor;

  if (typeof editor !== "undefined" && typeof varsEditor !== "undefined") {
    // restore previous fillVars for this template
    const lcFillVars = parseJSONText(localStorage.getItem("fillVars"));
    const newFillVarsText = JSON.stringify(lcFillVars[templateName] || {}, null, 2);

    editor.on("change", onCodeMirrorChange);
    varsEditor.on("change", onFillVarsChange);

    window.fillVarsCodeMirrorEditor.setValue(newFillVarsText);

  } else {
    setTimeout(listenToCodeMirror, 250);
  }
}

function onUploadImageClick(e) {
  $("#selectedImage").click();
  e.preventDefault();
}

function showError(title, message) {
  $('#errorModal .modal-title').text(title)
  $('#errorModal .modal-body').text(message)
  $('#errorModal').modal('show');
}

// When the uploadImage input is changed, upload the new image right away
function onUploadImageChange({ target: { files } }) {
  const formData = new FormData();

  if (files.length === 0) {
    $("#errContainer")
      .html("No files found. Please select a file.")
      .removeClass("d-none");
  }

  formData.append("file", files[0]);
  formData.append("region", localStorage.getItem("region"));

  const onUploadImageError = (message) => {
    const defaultContent = "Error uploading image. Please try again.";

    showError(defaultContent, message ?? defaultContent);
  }

  $.ajax({
    type: "POST",
    url: "/upload-image",
    data: formData,
    contentType: false,
    processData: false,

    success: function ({ url, error }) {
      // catches both null and undefined
      if (url == null || !!error) {
        onUploadImageError(error);
        return;
      }

      const editor = window.codeMirrorEditor;

      editor.replaceSelection(`<img src="${url}" alt="">`);
    },

    error: function (xhr) {
      onUploadImageError(xhr.responseJSON?.error);
    },
  });
}

function populateTextSectionContent() {
  //Will strip template html of html tags leaving inner content for the template text field
  const htmlString = window.codeMirrorEditor.getValue().trim();
  const textContent = $(htmlString).not('style').text().replace(/\s\s+/g, ' ').trim();
  const $templateText = $('#templateText');
  $templateText.val(textContent);
  $templateText.trigger('input'); // we need this event triggered to enable the update button (just as if someone was to type in this input).
}

(async function () {
  const versionChecked = sessionStorage.getItem('versionChecked');
  if (!versionChecked) {
    await $.get(`https://api.github.com/repos/MattRuddick/aws-ses-template-manager/tags`, (response) => {
      try {
        const latestVersion = response[0].name;
        if (currentVersion !== latestVersion) {
          sessionStorage.setItem('versionOutdated', 'true');
          sessionStorage.setItem('latestVersion', latestVersion);
        }
      } catch {
        console.warn('App version could not be checked.');
      }
    }).always(() => {
      // still mark versionCheck as done even if request failed. failsafe should the repo/url/git endpoint structure change in the future
      sessionStorage.setItem('versionChecked', 'true'); // indicates we have already checked the version
    });
  }

  $(document).ready(function () {
    if (sessionStorage.getItem('versionOutdated')) {
      const latestVersion = sessionStorage.getItem('latestVersion');
      $('body').append(`
        <a id="newVersionIndicator" href="https://github.com/MattRuddick/aws-ses-template-manager/releases/tag/${latestVersion}" target="_blank" data-toggle="tooltip" data-placement="bottom" data-html="true" title="<code>git pull</code> for latest version">
          New Version Available
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-cloud-download position-absolute" viewBox="0 0 16 16">
            <path d="M4.406 1.342A5.53 5.53 0 0 1 8 0c2.69 0 4.923 2 5.166 4.579C14.758 4.804 16 6.137 16 7.773 16 9.569 14.502 11 12.687 11H10a.5.5 0 0 1 0-1h2.688C13.979 10 15 8.988 15 7.773c0-1.216-1.02-2.228-2.313-2.228h-.5v-.5C12.188 2.825 10.328 1 8 1a4.53 4.53 0 0 0-2.941 1.1c-.757.652-1.153 1.438-1.153 2.055v.448l-.445.049C2.064 4.805 1 5.952 1 7.318 1 8.785 2.23 10 3.781 10H6a.5.5 0 0 1 0 1H3.781C1.708 11 0 9.366 0 7.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383z"/>
            <path d="M7.646 15.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 14.293V5.5a.5.5 0 0 0-1 0v8.793l-2.146-2.147a.5.5 0 0 0-.708.708l3 3z"/>
          </svg>
        </a>
      `);
      $('[data-toggle="tooltip"]').tooltip();
    }

    listenToCodeMirror();

    // get template name from window query string "name"
    templateName = window.location.search.split("name=")[1];

    $("#uploadImage").click(onUploadImageClick);
    $("#selectedImage").change(onUploadImageChange);
    $("#fillVariablesSave").click(onFillVarsSave);
    $("#fillVariablesClose").click(onFillVarsClose);
    $("#fillVarsModal").on("hidden.bs.modal", onFillVarsClose);
    $("#fillVarsModal").on("shown.bs.modal", onFillVarsOpen);
  });
})();
