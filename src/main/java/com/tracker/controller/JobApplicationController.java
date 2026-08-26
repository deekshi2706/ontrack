package com.tracker.controller;

import com.tracker.dto.JobApplicationRequest;
import com.tracker.model.JobApplication;
import com.tracker.model.Stage;
import com.tracker.repository.JobApplicationRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/applications")
public class JobApplicationController {

    private final JobApplicationRepository repository;

    public JobApplicationController(JobApplicationRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<JobApplication> getAll() {
        return repository.findAll();
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        List<JobApplication> all = repository.findAll();
        LocalDate today = LocalDate.now();

        long total = all.size();
        long offers = all.stream().filter(a -> a.getStage() == Stage.OFFER).count();
        long dueThisWeek = all.stream()
                .filter(a -> a.getDeadline() != null)
                .filter(a -> {
                    long days = today.until(a.getDeadline()).getDays();
                    return days >= 0 && days <= 7;
                })
                .count();
        long urgent = all.stream()
                .filter(a -> a.getDeadline() != null)
                .filter(a -> {
                    long days = today.until(a.getDeadline()).getDays();
                    return days >= 0 && days <= 3;
                })
                .count();

        return Map.of(
                "total", total,
                "offers", offers,
                "dueThisWeek", dueThisWeek,
                "urgent", urgent
        );
    }

    @PostMapping
    public ResponseEntity<JobApplication> create(@Valid @RequestBody JobApplicationRequest req) {
        JobApplication app = new JobApplication();
        applyRequest(app, req);
        JobApplication saved = repository.save(app);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<JobApplication> update(@PathVariable Long id, @Valid @RequestBody JobApplicationRequest req) {
        JobApplication app = repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Application not found: " + id));
        applyRequest(app, req);
        return ResponseEntity.ok(repository.save(app));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private void applyRequest(JobApplication app, JobApplicationRequest req) {
        app.setCompany(req.getCompany());
        app.setRole(req.getRole());
        app.setStage(req.getStage() != null ? req.getStage() : Stage.WISHLIST);
        app.setDeadline(req.getDeadline());
        app.setLink(req.getLink());
        app.setNotes(req.getNotes());
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(NoSuchElementException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", ex.getMessage()));
    }
}
