$(document).ready(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const templateName = urlParams.get('name');

  if (!templateName) {
    window.location.href = '/'; //something went wrong
  }

  window.codeMirrorEditor = window.CodeMirror.fromTextArea(document.querySelector('#codeMirror'), {
    mode: "htmlmixed",
    lineNumbers: true
  });

  window.fillVarsCodeMirrorEditor = window.CodeMirror.fromTextArea(
    document.querySelector("#fillVarsCodeMirror"),
    {
      mode: "application/json",
      lineNumbers: true,
    }
  );

  $.get(`/get-template/${templateName}?region=${localStorage.getItem('region')}`, function (response) {
    $('#templateName').val(response.data.TemplateName);
    $('#templateSubject').val(response.data.SubjectPart);
    $('#templateText').val(response.data.TextPart);

    const newCodeMirrorValue = response.data.HtmlPart ? response.data.HtmlPart : "";

    // This is needed to detect changes in the editor, because the change event is also triggered when the editor is first loaded.
    window.previousCodeMirrorValue = newCodeMirrorValue;

    window.codeMirrorEditor.setValue(newCodeMirrorValue);

    $('#updateTemplateForm').removeClass('d-none'); //show the form only when we have pre-populated all inputs
    window.codeMirrorEditor.refresh();  //must be called to re draw the code editor
  });

  $('#updateTemplateForm').on('input', () => {
    $('#updateTemplateForm button').attr('disabled', false);
  });


  $('#updateTemplateForm').submit(function(e){
    window.isSubmitting = true;

    e.preventDefault();
    const putPayload = {
      "TemplateName": $('#templateName').val(),
      "HtmlPart": window.codeMirrorEditor.getValue(),
      "SubjectPart": $('#templateSubject').val(),
      "TextPart": $('#templateText').val(),
      "region": localStorage.getItem('region')
    };

    $.ajax({
      url: `/update-template`,
      type: 'PUT',
      data: putPayload,
      success: function() {
        window.location.href = '/';
      },
      error: function(xhr) {
        let content;
        if (xhr.responseJSON.message) {
          content = xhr.responseJSON.message;
        } else {
          content = "Error updating template. Please try again";
        }
        $('#errContainer').html(content).removeClass('d-none');
      }
    });
  });

});
